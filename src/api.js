// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('./shopify');
const shopifyAPI = require('./shopifyAPI');
const xmlparser = require('express-xml-bodyparser');

router.use(bodyParser.json());
router.use(xmlparser());

router.get('/prueba', (req, res) => {
  console.log('GET request to /prueba/');
  res.status(200).send('OK');
});

const webhookRoute = '/shopify-webhook';

router.get(webhookRoute + '/printalot/orders/', (req, res) => {
  console.log('GET request to ' + webhookRoute + '/printalot/orders/');
  res.send('GET request to ' + webhookRoute + '/printalot/orders/');
});


router.post(webhookRoute + '/printalot/orders/', (req, res) => {
  console.log('POST request to ' + webhookRoute + '/printalot/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'printalot-es' });
});


// Hacer consulta a todos los pedidos anteriores y hacer POST al webservice
router.get(webhookRoute + '/printalot/orders/unfulfilled/', (req, res) => {
  console.log('GET request to ' + webhookRoute + '/printalot/orders/unfulfilled/');
  res.send('GET request to ' + webhookRoute + '/printalot/orders/unfulfilled/');
  shopify.getUnfulfilledOrdersAndSendToWebService("printalot-es");
});

router.post(webhookRoute + '/shipments/', (req, res) => {
  console.log('POST request to ' + webhookRoute + '/shipments/', req.body);
  const store = obtenerCodigoSesionCliente(req.body);
  shopifyAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store: store });
});


//ShopifyAPI
function obtenerCodigoSesionCliente(reqBody) {
  const idCustomer = reqBody.pedido?.idcustomer?.[0] || '';
  

  // Agrega más casos según los tipos de tiendas en tu .env
  switch (idCustomer) {
    case process.env.PRINTALOT_IDCUSTOMER:
      return 'printalot-es';
    // Agrega más casos según sea necesario
    default:
      return 'default';
  }
}


module.exports = router;
