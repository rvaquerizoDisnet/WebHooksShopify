const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, sql, connectToDatabase } = require('../utils/database');


const carpeta = 'C:\\Users\\RaulV\\Documents\\correos';


// Función para procesar un archivo .txt
function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}\\${archivo}`;

    // Lee el contenido del archivo
    fs.readFile(rutaArchivo, 'utf8', (err, contenido) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        // Divide el contenido del archivo en líneas
        const lineas = contenido.split('\n');
        let cont = 0;
        // Itera sobre cada línea para extraer los datos
        lineas.forEach(linea => {
            cont++;
            if (linea.trim() !== '') { // Verifica que la línea no esté vacía ni undefined
                const campos = linea.split(/\t+/);

                const Tracking = campos[5];
                console.log("Tracking ", Tracking, " linea ", cont);
                if (campos[19]) {
                    let CustomerOrderNumber = campos[19];
                    if (CustomerOrderNumber.includes('@')) {
                        CustomerOrderNumber = campos[20]
                        console.log("CustomerOrderNumber:", CustomerOrderNumber, " linea ", cont);
                    } else {
                        console.log("CustomerOrderNumber ", CustomerOrderNumber, " linea ", cont);
                    }
                } else {
                    console.log("CustomerOrderNumber no está definido para esta línea.");
                }
            }

            ActualizarBBDDTracking(CustomerOrderNumber, Tracking)
        });

        // Elimina el archivo después de procesarlo
        /*
        fs.unlink(rutaArchivo, err => {
            if (err) {
                console.error('Error al eliminar el archivo:', err);
                return;
            }
            console.log('Archivo eliminado:', archivo);
        });*/
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

        // Filtra los archivos .txt
        const archivosTxt = archivos.filter(archivo => archivo.endsWith('.txt'));

        // Si hay al menos un archivo .txt
        if (archivosTxt.length > 0) {
            console.log('Se encontraron los siguientes archivos .txt:', archivosTxt);
            archivosTxt.forEach(archivo => {
                procesarArchivo(archivo);
            });
        } else {
            console.log('No se encontraron archivos .txt en la carpeta.');
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

        const IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;

        const query = `
            UPDATE DeliveryNoteHeader
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
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @codbarrasExp
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('codbarrasExp', sql.NVarChar, codbarrasExp);
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            await request.query(query);
            console.log(`Se ha actualizado el campo TrackingNumber con el valor ${codbarrasExp} y el IdOrder ${IdOrder}.`);
        } else {
            console.error('Error al insertar en OrderHeader:', IdOrder, error.message);
        }
    }
}


function cronCorreos(){
    cron.schedule('49 9 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 6:45');
        await procesarArchivos();
    });

    cron.schedule('45 9 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 10:45');
        await procesarArchivos();
    });

    cron.schedule('45 13 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 14:45');
        await procesarArchivos();
    });

    cron.schedule('45 16 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 17:45');
        await procesarArchivos();
    });

    cron.schedule('45 17 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 18:45');
        await procesarArchivos();
    });

    cron.schedule('45 18 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 19:45');
        await procesarArchivos();
    });

    cron.schedule('45 19 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 20:45');
        await procesarArchivos();
    });
}


module.exports = { cronCorreos };