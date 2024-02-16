// usersRouter.js
const express = require('express');
const path = require('path');
const router = express.Router();
const userService = require('../users/userService');
const { handleValidationErrors } = require('../autenticacion/validationMiddleware');
const { generarToken } = require('../autenticacion/authenticationMiddleware');

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../htmls/login.html'));
});

router.post('/register', handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    const usuarioExistente = await userService.verificarExistenciaUsuario(nombreUsuario);
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'Nombre de usuario ya está en uso.' });
    }

    await userService.registrarUsuario(username, password);

    // Generar token al registrar
    const token = generarToken({ username });
    res.status(201).json({ token, mensaje: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error('Error en el registro de usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});


router.get('/redirectLogin', (req, res) => {
  res.redirect('/users/login');
});


router.post('/login', handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    const token = await userService.iniciarSesion(username, password);

    if (token) {
      // Almacenar el token en el localStorage
      localStorage.setItem('token', token);

      res.json({ token, mensaje: 'Inicio de sesión exitoso.' });
    } else {
      res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }
  } catch (error) {
    console.error('Error en el inicio de sesión:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});
module.exports = router;