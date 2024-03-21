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
    idleTimeoutMillis: 60000,
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
    idleTimeoutMillis: 60000,
  },
};
//TODO Hacer migracion de la bbdd
const pool1 = new mssql.ConnectionPool(config1);
const pool2 = new mssql.ConnectionPool(config2);

const connectToDatabase = async (databaseNumber, options = {}) => {
  try {
    let config;
    if (databaseNumber === 1) {
      config = { ...config1, ...options };
    } else if (databaseNumber === 2) {
      config = { ...config2, ...options };
    } else {
      config = { ...config1, ...options };
    }

    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    return pool;
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

module.exports = { connectToDatabase, executeQuery };
