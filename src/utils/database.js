const mssql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
};

const pool = new mssql.ConnectionPool(config);

const connectToDatabase = async () => {
  try {
    await pool.connect();
    console.log('Conexión exitosa a la base de datos.');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
  }
};

module.exports = { connectToDatabase, pool };
