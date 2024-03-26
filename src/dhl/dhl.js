const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, connectToDatabase } = require('../utils/database');
const sql = require('mssql');

const carpeta = '/home/admin81/shares/DHL/TRAKING/';
const blacklistPath = '/home/admin81/shares/DHL/TRAKING/blacklist.csv';


// Función para procesar un archivo .csv
function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}/${archivo}`;

    // Verificar si el archivo está en la blacklist
    const fileName = archivo.split('.')[0];
    if (estaEnBlacklist(fileName)) {
        console.log(`El archivo ${archivo} está en la blacklist. No se procesará.`);
        return;
    }

    // Lee el contenido del archivo CSV
    fs.createReadStream(rutaArchivo)
        .pipe(csvParser({ separator: ',', headers: false }))
        .on('data', async (row) => {
            const CustomerOrderNumber = row[0];
            const Tracking = row[1];
            // Procesa los datos y actualiza la base de datos
            await ActualizarBBDDTracking(CustomerOrderNumber, Tracking);
        })
        .on('end', () => {
            fs.promises.unlink(rutaArchivo);
            console.log(`Archivo ${archivo} eliminado correctamente.`);
            // Añadir el nombre del archivo a la blacklist
            agregarABlacklist(fileName);
        });
}

// Función para verificar si un archivo está en la blacklist
function estaEnBlacklist(fileName) {
    if (!fs.existsSync(blacklistPath)) return false;

    const blacklist = fs.readFileSync(blacklistPath, 'utf-8').split('\n');
    return blacklist.includes(fileName);
}

// Función para añadir un archivo a la blacklist
function agregarABlacklist(fileName) {
    fs.appendFileSync(blacklistPath, `${fileName}\n`);
}


// Función para procesar todos los archivos en la carpeta
async function procesarArchivos() {
    // Lee la lista de archivos en la carpeta
    fs.readdir(carpeta, (err, archivos) => {
        if (err) {
            console.error('Error al leer la carpeta:', err);
            return;
        }

        // Filtra los archivos .csv
        for (const archivo of archivos) {
            if (archivo.endsWith('.CSV')) {
                procesarArchivo(archivo);
            }
        }
    });
}


async function ActualizarBBDDTracking(CustomerOrderNumber, Tracking) {
    let IdOrder = null;

    try {
        const pool = await connectToDatabase(1);
        const queryConsultaIdOrder = `
            SELECT IdOrder
            FROM OrderHeader
            WHERE CustomerOrderNumber = @CustomerOrderNumber;
        `;

        const requestConsultaIdOrder = pool.request();
        requestConsultaIdOrder.input('CustomerOrderNumber', sql.NVarChar, CustomerOrderNumber.toString()); 

        const resultConsultaIdOrder = await requestConsultaIdOrder.query(queryConsultaIdOrder);
        if (resultConsultaIdOrder.recordset.length === 0) {
            console.log('No se encontró el CustomerOrderNumber en la tabla OrderHeader.');
            return;
        }

        if (resultConsultaIdOrder.recordset.length === 1) {
            IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;
        } else {
            await enviarCorreoIncidencia(CustomerOrderNumber, Tracking);
            throw new Error('Hay múltiples IdOrder con TrackingNumber NULL.');
        }

        const queryDeliveryNoteHeader = `
            UPDATE DeliveryNoteHeader
            SET TrackingNumber = @Tracking
            WHERE IdOrder = @IdOrder;
        `;
        const requestDeliveryNoteHeader = pool.request();
        requestDeliveryNoteHeader.input('Tracking', sql.NVarChar, Tracking);
        requestDeliveryNoteHeader.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await requestDeliveryNoteHeader.query(queryDeliveryNoteHeader);
        console.log("Tracking actualizado para ", IdOrder)

        // Ejecutar la segunda consulta para actualizar el TrackingNumber en la tabla PackingList
        const queryPackingList = `
            UPDATE PL
            SET PL.TrackingNumber = @Tracking
            FROM PackingList PL
            INNER JOIN DeliveryNoteLinesLocations DNL ON PL.IdDeliveryNoteLinesLocations = DNL.IdDeliveryNoteLinesLocations
            INNER JOIN DeliveryNoteLines DNLN ON DNL.IdDeliveryNotesLines = DNLN.IdDeliveryNotesLines
            INNER JOIN DeliveryNoteHeader DN ON DNLN.IdDeliveryNote = DN.IdDeliveryNote
            WHERE DN.IdOrder = @IdOrder;
        `;
        const requestPackingList = pool.request();
        requestPackingList.input('Tracking', sql.NVarChar, Tracking);
        requestPackingList.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await requestPackingList.query(queryPackingList);
        console.log("Tracking actualizado en PackingList para ", IdOrder);
        
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            ActualizarBBDDTracking(CustomerOrderNumber, Tracking)
        } else {
            console.error('Error al insertar en OrderHeader:', IdOrder, error.message);
        }
    }
}



async function enviarCorreoIncidencia(CustomerOrderNumber, Tracking) {
    try {
        const transporter = nodemailer.createTransport({
            host: 'mail.disnet.es',
            port: 25,
            secure: false,
            ignoreTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_2,
            subject: `Incidencia en un pedido de dhl`,
            text: `No se ha podido añadir el tracking number al pedido ${CustomerOrderNumber} con el tracking ${Tracking} por haber mas de un idOrder para el CustomerOrderNumber`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo electrónico enviado:', info.response);
    } catch (error) {
        console.log('Error en enviarCorreoIncidencia:', error);
    }
}



function crondhl() {
    cron.schedule('*/15 8-18 * * *', async () => {
        console.log('Ejecutando consulta a DHL cada 15 minutos entre las 8:00 y las 18:00');
        await procesarArchivos();
    });
}




module.exports = { crondhl };