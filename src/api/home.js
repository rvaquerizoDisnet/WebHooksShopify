// api/home.js
const express = require('express');
const path = require('path');
const router = express.Router();
const { protegerRuta } = require('../autenticacion/authMiddleware');

// Agrega aquí todas tus rutas disponibles
const rutasDisponibles = [
  '/printalot/orders/unfulfilled/',
  '/modify-shipment',
  // Agrega más rutas según sea necesario
];

router.get('/', (req, res) => {
  // Verifica si el usuario está autenticado
  if (req.usuario) {
    // Si el usuario está autenticado, muestra la página de inicio
    const usuario = req.usuario;

    // Genera la lista de enlaces
    const listaEnlaces = rutasDisponibles.map(ruta => `<li><a href="${ruta}">${ruta}</a></li>`).join('');

    // Crea el HTML con la lista de enlaces
    const html = `
      <h1>Bienvenido, ${usuario}</h1>
      <h2>Rutas Disponibles:</h2>
      <ul>${listaEnlaces}</ul>
    `;

    res.send(html);
  } else {
    // Si el usuario no está autenticado, redirige al inicio de sesión
    res.redirect('/users/login');
  }
});

module.exports = router;