// database.js
const mssql = require('mssql');
require('dotenv').config();

const config1 = {
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

const config2 = {
  user: process.env.DB_USER_B,
  password: process.env.DB_PASSWORD_B,
  server: process.env.DB_SERVER_B,
  database: process.env.DB_DATABASE_B,
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

const pool1 = new mssql.ConnectionPool(config1);
const pool2 = new mssql.ConnectionPool(config2);

const connectToDatabase = async (databaseNumber) => {
  try {
    if (databaseNumber === 1) {
      await pool1.connect();
      return pool1;
    } else if (databaseNumber === 2) {
      await pool2.connect();
      return pool2;
    } else {
      await pool1.connect();
      return pool1;
    }
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    throw error;
  }
};

const executeQuery = async (query, databaseNumber) => {
  const pool = await connectToDatabase(databaseNumber);
  const request = pool.request();
  const result = await request.query(query);
  return result;
};

module.exports = { connectToDatabase, closeDatabaseConnection, executeQuery };
