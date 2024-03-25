const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, connectToDatabase } = require('../utils/database');
const sql = require('mssql');

function cronUPS(){
    // Cron para ejecutar cada 12 minutos a partir de las 5:35 hasta las 18:35
    cron.schedule('35 5-18/1 * * *', async () => {
        console.log('Ejecutando consulta a UPS');
        await consultaUPS();
    });
}
async function consultaUPS() {
    try {
        const fechaHoy = moment().format('YYYYMMDD');
        const csvFilePath = '/home/admin81/shares/UPS/Tracking/UPSTracking.csv';
        const rows = [];
        fs.createReadStream(csvFilePath)
        .pipe(csvParser({ separator: ';', headers: false }))
        .on('data', (row) => {
            const fechaCSV = row[3];
            if (fechaCSV == fechaHoy) {
                rows.push(row);
            }
        })
        .on('end', () => {
            for (const pedido of rows) {
                actualizarTracking(pedido[1], pedido[2]);
            }
            console.log(`Consultados y actualizados pedidos de UPS`);
        });
    } catch (error) {
        console.error('Error al ejecutar la consulta a UPS:', error);
    }
}



async function actualizarTracking(NumeroAlbaran, TrackingNumber){
    try {
        const pool = await connectToDatabase(1);
        const query = `
            UPDATE DeliveryNoteHeader
            SET TrackingNumber = @TrackingNumber
            WHERE IdOrder = @NumeroAlbaran and St_DeliverynoteHeader = 'FIN';
        `;
        const request = pool.request();
        request.input('NumeroAlbaran', sql.NVarChar, NumeroAlbaran);
        request.input('TrackingNumber', sql.NVarChar, TrackingNumber);
        await request.query(query);
        console.log("Tracking Number actualizado de ", NumeroAlbaran)
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            const pool = await connectToDatabase(1);
            const query = `
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @TrackingNumber
                WHERE IdOrder = @NumeroAlbaran;
            `;
            const request = pool.request();
            request.input('NumeroAlbaran', sql.NVarChar, NumeroAlbaran);
            request.input('TrackingNumber', sql.NVarChar, TrackingNumber);
            await request.query(query);
        } else {
            console.error('Error al actualizar el tracking number', error.message);
        }
    }
}

module.exports = { cronUPS };