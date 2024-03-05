const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, sql, connectToDatabase } = require('../utils/database');


function cronUPS(){
    cron.schedule('35 5 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 6:35');
        await consultaUPS();
    });

    cron.schedule('35 9 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 10:35');
        await consultaUPS();
    });

    cron.schedule('35 13 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 14:35');
        await consultaUPS();
    });

    cron.schedule('35 16 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 17:35');
        await consultaUPS();
    });

    cron.schedule('35 17 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 18:35');
        await consultaUPS();
    });

    cron.schedule('35 18 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 19:35');
        await consultaUPS();
    });

    cron.schedule('35 19 * * *', async () => {
        console.log('Ejecutando consulta a UPS a las 20:35');
        await consultaUPS();
    });
}

async function consultaUPS() {
    try {
    const fechaHoy = moment().format('YYYY/MM/DD');

    const csvFilePath = '/home/admin81/shares/UPS/tracking/UPS_CSV_EXPORT.csv';
    const rows = []; 

    fs.createReadStream(csvFilePath)
         .pipe(csvParser())
         .on('data', (row) => {
             // Filtrar los registros del día anterior con el departamento_exp correspondiente
             if (
                moment(row.fechaTransmision, 'YYYY/MM/DD').isSame(moment(fechaHoy, 'YYYY/MM/DD')) 
             ) {
                 rows.push(row);
             }
         })
         .on('end', () => {
             // Iterar sobre los registros filtrados
             for (const pedido of rows) {
                actualizarTracking(pedido.PaqueteReferencia1, pedido.PaqueteNumerodeseguimiento);
             }
             console.log(`Consultados y actualizados pedidos de UPS`);
         });

    } catch (error) {
        console.error('Error al ejecutar la consulta a UPS:', error);
    }
}


async function actualizarTracking(NumeroAlbaran, TrackingNumber){
    try {
        const pool = await connectToDatabase();
        const query = `
            UPDATE DeliveryNoteHeader
            SET TrackingNumber = @TrackingNumber
            WHERE IdOrder = @NumeroAlbaran;
        `;
        const request = pool.request();
        request.input('NumeroAlbaran', sql.NVarChar, NumeroAlbaran.toString());
        request.input('TrackingNumber', sql.NVarChar, TrackingNumber);
        await request.query(query);
        console.log("Tracking Number actualizado")
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            const pool = await connectToDatabase();
            const query = `
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @TrackingNumber
                WHERE IdOrder = @NumeroAlbaran;
            `;
            const request = pool.request();
            request.input('NumeroAlbaran', sql.NVarChar, NumeroAlbaran.toString());
            request.input('TrackingNumber', sql.NVarChar, TrackingNumber);
            await request.query(query);
        } else {
            console.error('Error al actualizar el tracking number', error.message);
        }
    }
}

module.exports = { cronUPS };