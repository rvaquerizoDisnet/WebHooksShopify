// database2.js
const mssql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER2,
  password: process.env.DB_PASSWORD2,
  server: process.env.DB_SERVER2,
  database: process.env.DB_DATABASE2,
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

const pool2 = new mssql.ConnectionPool(config);

const connectToDatabase2 = async () => {
  try {
    await pool2.connect();
    return pool2;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    throw error;
  }
};


const executeQuery2 = async (query) => {
  const pool2 = await connectToDatabase2();
  const request = pool2.request();
  const result = await request.query(query);
  return result;
};

module.exports = { connectToDatabase2, executeQuery2, pool2, sql2: mssql };
