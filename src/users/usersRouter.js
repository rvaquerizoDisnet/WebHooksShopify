const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();
const userService = require('../users/userService');
const { handleValidationErrors } = require('../autenticacion/validationMiddleware');
const { generarToken } = require('../autenticacion/authenticationMiddleware');

let failedLoginAttempts = {}; // Objeto para almacenar los intentos de inicio de sesión fallidos

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../htmls/login.html'));
});

router.get('/redirectLogin', (req, res) => {
  res.redirect('/users/login');
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../htmls/register.html'));
});

router.post('/login', handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar si el usuario ha excedido el número de intentos de inicio de sesión fallidos
    if (failedLoginAttempts[username] && failedLoginAttempts[username] >= 5) {
      const errorMessage = encodeURIComponent('Has excedido el número máximo de intentos de inicio de sesión fallidos. Por favor, espera 1 minuto antes de intentarlo de nuevo.');
      return res.redirect(`/users/login?error=${errorMessage}`);
    }

    const usuario = await userService.iniciarSesion(username, password);
    if (usuario) {
      // Si el inicio de sesión es exitoso, eliminar los intentos fallidos registrados
      delete failedLoginAttempts[username];

      const token = generarToken({ username: usuario.username, rol: usuario.rol });
      res.cookie('token', token, { httpOnly: false, maxAge: 3600000, sameSite: 'none', secure: true });
      res.redirect('/');
    } else {
      // Si las credenciales son inválidas, aumentar el contador de intentos fallidos
      failedLoginAttempts[username] = (failedLoginAttempts[username] || 0) + 1;

      const errorMessage = encodeURIComponent('Credenciales invalidas, intentalo de nuevo');
      return res.redirect(`/users/login?error=${errorMessage}`);
    }
  } catch (error) {
    console.error('Error en el inicio de sesión:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

router.post('/register', handleValidationErrors, async (req, res) => {
  try {
    const { username, password, rol } = req.body;

    const usuarioExistente = await userService.verificarExistenciaUsuario(username);
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'Nombre de usuario ya está en uso.' });
    }

    await userService.registrarUsuario(username, password, rol);

    const token = generarToken({ username, rol });
    res.cookie('token', token, { httpOnly: false, maxAge: 3600000, sameSite: 'none', secure: true });
    res.redirect('/');
  } catch (error) {
    console.error('Error en el registro de usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/users/login');
});

module.exports = router;