const mssql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    enableArithAbort: true, 
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000,
  },
};

const pool = new mssql.ConnectionPool(config);

const connectToDatabase = async () => {
  try {
    await pool.connect();
    console.log('Conexión exitosa a la base de datos.');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    throw error;
  }
};

const closeDatabaseConnection = async () => {
  try {
    await pool.close();
    console.log('Conexión cerrada correctamente.');
  } catch (error) {
    console.error('Error al cerrar la conexión:', error.message);
  }
};

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

module.exports = { connectToDatabase, closeDatabaseConnection, pool };
