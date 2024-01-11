// userService.js
const mssql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, connectToDatabase } = require('../utils/database');

// Esta función verifica la existencia de un usuario en la base de datos
const verificarExistenciaUsuario = async (username) => {
  try {
    await connectToDatabase();

    const result = await pool
      .request()
      .input('username', mssql.VarChar, username)
      .query('SELECT * FROM Usuarios WHERE username = @username');

    return result.recordset.length > 0;
  } catch (error) {
    console.error('Error al verificar existencia de usuario:', error.message);
    throw error;
  }
};

// Esta función registra un nuevo usuario en la base de datos
const registrarUsuario = async (username, password, rol) => {
  try {
    await connectToDatabase();

    const hashContrasena = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input('username', mssql.VarChar, username)
      .input('hashContrasena', mssql.VarChar, hashContrasena)
      .input('rol', mssql.VarChar, rol)
      .query('INSERT INTO Usuarios (username, password, rol) VALUES (@username, @hashContrasena, @rol)');
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    throw error;
  }
};

const iniciarSesion = async (username, password) => {
  try {
    await connectToDatabase();

    const result = await pool
      .request()
      .input('username', mssql.VarChar, username)
      .query('SELECT password, rol FROM Usuarios WHERE username = @username');

    if (result.recordset.length > 0) {
      const hashContrasenaDB = result.recordset[0].password;
      const coinciden = await bcrypt.compare(password, hashContrasenaDB);

      if (coinciden) {
        const token = jwt.sign({
          username,
          rol: result.recordset[0].rol
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return token;
      }
    }

    return null;
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    throw error;
  }
};

module.exports = { verificarExistenciaUsuario, registrarUsuario, iniciarSesion };