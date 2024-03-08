const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, sql, connectToDatabase } = require('../utils/database');


const carpeta = 'C:\\Users\\RaulV\\Documents\\dhl';


// Función para procesar un archivo .csv
function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}\\${archivo}`;

    // Lee el contenido del archivo CSV
    fs.createReadStream(rutaArchivo)
        .pipe(csvParser())
        .on('data', async (row) => {
            const CustomerOrderNumber = row[0];
            const Tracking = row[1];
            console.log('CustomerOrderNumber:', CustomerOrderNumber);
            console.log('Tracking:', Tracking);
            // Procesa los datos y actualiza la base de datos
            await ActualizarBBDDTracking(CustomerOrderNumber, Tracking);
        })
        .on('end', () => {
            // Elimina el archivo después de procesarlo
            fs.unlink(rutaArchivo, err => {
                if (err) {
                    console.error('Error al eliminar el archivo:', err);
                    return;
                }
                console.log('Archivo eliminado:', archivo);
            });
        });
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
        const archivoscsv = archivos.filter(archivo => archivo.endsWith('.csv'));

        // Si hay al menos un archivo .csv
        if (archivoscsv.length > 0) {
            console.log('Se encontraron los siguientes archivos .csv:', archivoscsv);
            archivoscsv.forEach(archivo => {
                procesarArchivo(archivo);
            });
        } else {
            console.log('No se encontraron archivos .csv en la carpeta.');
        }
    });
}


async function ActualizarBBDDTracking(CustomerOrderNumber, Tracking) {
    try {
        const pool = await connectToDatabase();
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

        let IdOrder = null;
        if (resultConsultaIdOrder.recordset.length === 1) {
            IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;
        } else {
             await enviarCorreoIncidencia(CustomerOrderNumber, Tracking)
             throw new Error('Hay múltiples IdOrder con TrackingNumber NULL.');
            }

        const query = `
            UPDATE MiddlewareDNH
            SET TrackingNumber = @Tracking
            WHERE IdOrder = @IdOrder;
        `;
        const request = pool.request();
        request.input('Tracking', sql.NVarChar, Tracking);
        request.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await request.query(query);
        console.log(`Se ha actualizado el campo TrackingNumber con el valor ${Tracking} y el IdOrder ${IdOrder}.`);
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            const pool = await connectToDatabase();
            const query = `
                UPDATE MiddlewareDNH
                SET TrackingNumber = @Tracking
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('Tracking', sql.NVarChar, Tracking);
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            await request.query(query);
            console.log(`Se ha actualizado el campo TrackingNumber con el valor ${Tracking} y el IdOrder ${IdOrder}.`);
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



function crondhl(){
    cron.schedule('43 10 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 6:45');
        await procesarArchivos();
    });

    cron.schedule('45 9 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 10:45');
        await procesarArchivos();
    });

    cron.schedule('45 13 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 14:45');
        await procesarArchivos();
    });

    cron.schedule('45 16 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 17:45');
        await procesarArchivos();
    });

    cron.schedule('45 17 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 18:45');
        await procesarArchivos();
    });

    cron.schedule('45 18 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 19:45');
        await procesarArchivos();
    });

    cron.schedule('45 19 * * *', async () => {
        console.log('Ejecutando consulta a dhl a las 20:45');
        await procesarArchivos();
    });
}


module.exports = { crondhl };