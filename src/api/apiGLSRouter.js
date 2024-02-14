// apiGLSRouter.js
const express = require('express');
const router = express.Router();
const glsService = require('../gls/glsService');
const { verificarToken } = require('../autenticacion/authenticationMiddleware');
const { handleValidationErrors } = require('../autenticacion/validationMiddleware');
const { protegerRuta } = require('../autenticacion/authMiddleware');
const path = require('path');
const fs = require('fs');


router.get('/modify-shipment', protegerRuta(['admin', 'gls']), (req, res) => {
  // Obtener el token del localStorage
  const token = localStorage.getItem('token');

  // Enviar el token en la cabecera de la solicitud
  fetch('/gls/modify-shipment', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));

  const formPath = path.join(__dirname, '../htmls/form.html');
  const formContent = fs.readFileSync(formPath, 'utf8');
  res.send(formContent);
});

router.post('/modify-shipment', protegerRuta(['admin', 'gls']), handleValidationErrors, (req, res) => {
  // Obtener el token del localStorage
  const token = localStorage.getItem('token');

  // Enviar el token en la cabecera de la solicitud
  fetch('/gls/modify-shipment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));

  console.log('POST request to /gls/modify-shipment', req.body);

  // Resto del código para modificar el envío
  glsService.modifyShipment(req.body)
    .then((response) => {
      res.json({ message: 'Shipment modified successfully', response });
    })
    .catch((error) => {
      console.error('Error modifying shipment:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    });
});

module.exports = router;