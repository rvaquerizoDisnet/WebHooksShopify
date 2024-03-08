const fs = require('fs');
const csvParser = require('csv-parser');
const cron = require('node-cron');
require('dotenv').config();
const { pool, sql, connectToDatabase } = require('../utils/database');

const carpeta = 'C:\\Users\\RaulV\\Documents\\ups';

// Función para procesar un archivo CSV
function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}\\${archivo}`;
    const fechaHoy = new Date().toISOString().slice(0, 10);

    fs.createReadStream(rutaArchivo)
        .pipe(csvParser({ separator: ';' })) // Configurar el separador como ;
        .on('data', async (row) => {
            const CustomerOrderNumber = row[0].trim();
            const Tracking = row[2].trim();
            const fechaPedido = row[3].trim();

            // Comprobar si la fecha del pedido es igual a la fecha actual
            if (fechaPedido === fechaHoy) {
                await ActualizarBBDDTracking(CustomerOrderNumber, Tracking);
            }
        })
        .on('end', () => {
            console.log(`Se ha procesado el archivo ${archivo}`);
            // Eliminar el archivo después de procesarlo
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
    fs.readdir(carpeta, (err, archivos) => {
        if (err) {
            console.error('Error al leer la carpeta:', err);
            return;
        }

        const archivosCSV = archivos.filter(archivo => archivo.endsWith('.csv'));

        if (archivosCSV.length > 0) {
            console.log('Se encontraron los siguientes archivos CSV:', archivosCSV);
            archivosCSV.forEach(archivo => {
                procesarArchivo(archivo);
            });
        } else {
            console.log('No se encontraron archivos CSV en la carpeta.');
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
        requestConsultaIdOrder.input('CustomerOrderNumber', sql.NVarChar, CustomerOrderNumber); 

        const resultConsultaIdOrder = await requestConsultaIdOrder.query(queryConsultaIdOrder);
        if (resultConsultaIdOrder.recordset.length === 0) {
            console.log('No se encontró el CustomerOrderNumber en la tabla OrderHeader.');
            return;
        }

        const IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;

        const query = `
            UPDATE MiddlewareDNH
            SET TrackingNumber = @Tracking
            WHERE IdOrder = @IdOrder;
        `;
        const request = pool.request();
        request.input('Tracking', sql.NVarChar, Tracking);
        request.input('IdOrder', sql.NVarChar, IdOrder);
        await request.query(query);
        console.log(`Se ha actualizado el campo TrackingNumber con el valor ${Tracking} para el IdOrder ${IdOrder}.`);
    } catch (error) {
        console.error('Error al actualizar la base de datos:', error);
    }
}

function cronUPS() {
    cron.schedule('0 6 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 6:00');
        await procesarArchivos();
    });
}

module.exports = { cronUPS };
