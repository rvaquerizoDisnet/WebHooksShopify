// api.js
const express = require('express');
const bodyParser = require('body-parser');

const router = express.Router();

// Endpoint para solicitudes GET en /shopify-webhook/orders/
router.get('/shopify-webhook/orders/', (req, res) => {
  res.send('GET request to /shopify-webhook/orders/');
});

// Endpoint para solicitudes POST en /shopify-webhook/orders/
router.post('/shopify-webhook/orders/', (req, res) => {
  // Manejo de la solicitud POST
  console.log('POST request to /shopify-webhook/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
});

// Exporta el router en lugar de la aplicación
module.exports = router;
