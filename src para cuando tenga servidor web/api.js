// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('./shopify');

// Middleware para parsear el cuerpo de las solicitudes en formato JSON
router.use(bodyParser.json());

// Endpoint para solicitudes GET en /shopify-webhook/printalot/orders/
router.get('/shopify-webhook/printalot/orders/', (req, res) => {
  console.log('GET request to /shopify-webhook/printalot/orders/');
  res.send('GET request to /shopify-webhook/printalot/orders/');
});

// Endpoint para solicitudes POST en /shopify-webhook/printalot/orders/
router.post('/shopify-webhook/printalot/orders/', (req, res) => {
  // Manejo de la solicitud POST
  console.log('POST request to /shopify-webhook/printalot/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  // Llama a la función handleWebhook del módulo shopify.js
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'printalot' });
});

module.exports = router;
