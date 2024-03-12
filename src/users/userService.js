// userService.js
const mssql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('../utils/database');

const iniciarSesion = async (username, password) => {
  try {
    const pool = await connectToDatabase(2);

    if (!pool) {
      throw new Error('La conexión a la base de datos no se ha establecido correctamente.');
    }

    const result = await pool
      .request()
      .input('username', mssql.VarChar, username)
      .query('SELECT password, rol FROM MiddlewareUsuarios WHERE username = @username');

    if (result.recordset.length > 0) {
      const hashContrasenaDB = result.recordset[0].password;
      const coinciden = await bcrypt.compare(password, hashContrasenaDB);

      if (coinciden) {
        const token = jwt.sign({
          username,
          rol: result.recordset[0].rol
        }, process.env.JWT_SECRET, { algorithm: 'HS256' });

        return token;
      }
    }

    return null; // Devuelve null si las credenciales no coinciden
  } catch (error) {
    console.error('Error en el inicio de sesión:', error.message);
    throw error;
  }
};

const verificarExistenciaUsuario = async (username) => {
  try {
    const pool = await connectToDatabase(2);

    if (!pool) {
      throw new Error('La conexión a la base de datos no se ha establecido correctamente.');
    }

    const result = await pool
      .request()
      .input('username', mssql.VarChar, username)
      .query('SELECT * FROM MiddlewareUsuarios WHERE username = @username');

    return result.recordset.length > 0;
  } catch (error) {
    console.error('Error al verificar existencia de usuario:', error.message);
    throw error;
  }
};

const registrarUsuario = async (username, password, rol = 'admin') => {
  try {
    const pool = await connectToDatabase(2);

    const hashContrasena = await bcrypt.hash(password, 10);

    const request = pool.request();
    await request
      .input('username', mssql.VarChar, username)
      .input('hashContrasena', mssql.VarChar, hashContrasena)
      .input('rol', mssql.VarChar, rol)
      .query('INSERT INTO MiddlewareUsuarios (username, password, rol) VALUES (@username, @hashContrasena, @rol)');
  } catch (error) {
    console.error('Error en el registro de usuario:', error.message);
    throw error;
  }
};

module.exports = { iniciarSesion, verificarExistenciaUsuario, registrarUsuario };
