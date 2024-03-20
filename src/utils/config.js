// insertClientWooCommerce.js
const { pool, connectToDatabase } = require('../utils/database');
const sql = require('mssql');


async function updateConfigDB(Nave, Pedidos, Reubicaciones, Mensaje) {
    try {
        const pool = await connectToDatabase(2);
        const request = pool.request();
        const query = `
        UPDATE MWDashboard
        SET 
            Pedidos = @Pedidos, 
            Reubicaciones = @Reubicaciones, 
            Mensaje = @Mensaje
        WHERE Nave = @Nave
        `;
        await request
            .input('Nave', sql.Int, Nave)
            .input('Pedidos', Pedidos)
            .input('Reubicaciones', Reubicaciones)
            .input('Mensaje', sql.NVarChar, Mensaje)
            .query(query);
        console.log('Datos actualizados correctamente en la base de datos.');
        } catch (error) {
        console.error('Error al actualizar en la base de datos:', error);
        throw error;
    }
}


module.exports = { updateConfigDB };