// userService.js
const mssql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, connectToDatabase } = require('../utils/database');

const verificarExistenciaUsuario = async (username) => {
  try {
    await connectToDatabase(2);

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
    await connectToDatabase(2);

    const hashContrasena = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input('username', mssql.VarChar, username)
      .input('hashContrasena', mssql.VarChar, hashContrasena)
      .input('rol', mssql.VarChar, rol)
      .query('INSERT INTO MiddlewareUsuarios (username, password, rol) VALUES (@username, @hashContrasena, @rol)');
  } catch (error) {
    res.redirect('/users/register?error=Registrese de nuevo, ha ocurrido un error.'); 
  }
};

const iniciarSesion = async (username, password) => {
  try {
    await connectToDatabase(2);

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

    return null;
  } catch (error) {
    res.redirect('/users/login?error=Inicie sesión de nuevo, ha ocurrido un error.'); 
  }
};

module.exports = { verificarExistenciaUsuario, registrarUsuario, iniciarSesion };