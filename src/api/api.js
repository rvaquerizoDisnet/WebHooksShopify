// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('../shopify/shopify');
const shopifyAPI = require('../shopify/shopifyAPI');
const xmlparser = require('express-xml-bodyparser');
const { protegerRuta } = require('../autenticacion/authMiddleware')
const util = require('util');

router.use(bodyParser.json());
router.use(xmlparser());



router.get('/printalot/orders/', (req, res) => {
  console.log('GET request to ' + '/printalot/orders/');
  res.send('GET request to ' + '/printalot/orders/');
});


router.post('/printalot/orders/', (req, res) => {
  console.log('POST request to ' + '/printalot/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'printalot-es' });
});


// Hacer consulta a todos los pedidos anteriores y hacer POST al webservice
router.get('/printalot/orders/unfulfilled/', (req, res) => {
  console.log('GET request to ' + 'shopify' + '/printalot/orders/unfulfilled/');
  res.send('GET request to ' + 'shopify' + '/printalot/orders/unfulfilled/');
  shopify.getUnfulfilledOrdersAndSendToWebService("printalot-es");
});


// Cuando el ABC haga post se ejecutara esta funcion para modificar la API de shopify
router.post( '/shipments/', (req, res) => {
  console.log('POST request to ' + '/shipments/');
  // Imprimir información sobre los datos recibidos
  //console.log('Request Body:', util.inspect(req.body, { depth: null }));
  const store = obtenerCodigoSesionCliente(req.body);
  shopifyAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store: store });
});


// Funcion para que segun que id customer venga escoja una tienda o otra
function obtenerCodigoSesionCliente(reqBody) {
  const idCustomerArray = reqBody.pedidos?.pedido?.[0]?.idcustomer || [];
  // Verifica si PRINTALOT_IDCUSTOMER está presente en el arreglo
  const isPrintalotCustomer = idCustomerArray.includes(process.env.PRINTALOT_IDCUSTOMER);
  // Agrega más casos según los tipos de tiendas en tu .env
  if (isPrintalotCustomer) {
    return 'printalot-es';
  }
  // Agrega más casos según sea necesario
  return 'default';
}



module.exports = router;
