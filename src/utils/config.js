// insertClientWooCommerce.js
const { pool, connectToDatabase } = require('../utils/database');
const sql = require('mssql');


async function updateConfigDB(Nave, Pedidos, Reubicaciones, Mensaje) {
  try {
    const pool = await connectToDatabase(2);
    const request = pool.request();
    const query = `
    UPDATE MWPantallas
    SET 
        Pedidos = @Pedidos, 
        Reubicaciones = @Reubicaciones, 
        Mensaje = @Mensaje, 
        TransportCompany = @transportCompany
    WHERE Nave = @Nave
    `;
    console.log('Consulta SQL:', query);
    await request
        .input('Nave', sql.Int, Nave)
        .input('Pedidos', sql.Boolean, Pedidos)
        .input('Reubicaciones', sql.NVarChar, Reubicaciones)
        .input('Mensaje', sql.NVarChar, Mensaje)
        .query(query);
    console.log('Datos actualizados correctamente en la base de datos.');
    } catch (error) {
    console.error('Error al actualizar en la base de datos:', error);
    throw error;
    }
}


module.exports = { updateConfigDB };