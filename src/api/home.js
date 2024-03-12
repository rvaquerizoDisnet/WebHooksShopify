const express = require('express');
const path = require('path');
const router = express.Router();
const { verificarToken } = require('../autenticacion/authenticationMiddleware'); // Asegúrate de importar el middleware aquí

router.get('/', verificarToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../htmls/home.html'));
});

module.exports = router;
