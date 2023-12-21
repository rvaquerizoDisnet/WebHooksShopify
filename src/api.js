// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('./shopify');
const shopifyAPI = require('./shopifyAPI');

router.use(bodyParser.json());

router.get('/prueba', (req, res) => {
  console.log('GET request to /prueba/');
  res.status(200).send('OK');
});

// Modifica las rutas para usar ngrok
const webhookRoute = '/webhooks/shopify';
router.get(webhookRoute + '/printalot/orders/', (req, res) => {
  console.log('GET request to ' + webhookRoute + '/printalot/orders/');
  res.send('GET request to ' + webhookRoute + '/printalot/orders/');
});

router.post(webhookRoute + '/printalot/orders/', (req, res) => {
  console.log('POST request to ' + webhookRoute + '/printalot/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'printalot' });
});

router.post(webhookRoute + '/shipments/', (req, res) => {
  console.log('POST request to ' + webhookRoute + '/shipments/', req.body);
  const storeCode = obtenerCodigoSesionCliente(req.body);
  shopifyAPI.handleShipment({ tipo: 'shipments', req, res, store: storeCode });
  res.json({ message: 'Shipment request received successfully' });
});

module.exports = router;
//ShopifyAPI

// Función para obtener el código de Sesion_Cliente según el tipo de tienda
function obtenerCodigoSesionCliente(reqBody) {
  // Asegúrate de que reqBody contenga la propiedad correcta que tiene el código de Sesion_Cliente
  const sesionCliente = reqBody.Sesion_Cliente || '';

  // Agrega más casos según los tipos de tiendas en tu .env
  switch (sesionCliente) {
    case process.env.PRINTALOT_SESSION_CODE:
      return 'printalot';
    // Agrega más casos según sea necesario
    default:
      return 'default'; // O el valor que desees para el caso predeterminado
  }
}


module.exports = router;
