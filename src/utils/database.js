// database.js
const mssql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  encrypt: true,
  trustServerCertificate: true,
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
    return pool;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    throw error;
  }
};

const closeDatabaseConnection = async () => {
  try {
    await pool.close();
  } catch (error) {
    console.error('Error al cerrar la conexión:', error.message);
  }
};

const executeQuery = async (query) => {
  const pool = await connectToDatabase();
  const request = pool.request();
  const result = await request.query(query);
  return result;
};

module.exports = { connectToDatabase, closeDatabaseConnection, executeQuery, pool, sql: mssql };
