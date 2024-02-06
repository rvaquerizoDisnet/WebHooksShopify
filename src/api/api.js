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
  res.send('GET request to ' + '/printalot/orders/ actualizado');
});


router.post('/printalot/orders/', (req, res) => {
  console.log('POST request to ' + '/printalot/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  // Lamar al metodo y pasar como parametro la tienda(es importante que el nombre da la tienda coincida con el nombre en la URL de la tienda de shopify, porque lo utilizaremos para formar la URL)
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'printalot-es' });
});



// Hacer consulta a todos los pedidos anteriores y hacer POST al webservice
router.get('/printalot/orders/unfulfilled/', (req, res) => {
  console.log('GET request to ' + 'shopify' + '/printalot/orders/unfulfilled/');
  res.send('GET request to ' + 'shopify' + '/printalot/orders/unfulfilled/');
  // Lamar al metodo y pasar como parametro la tienda(es importante que el nombre da la tienda coincida con el nombre en la URL de la tienda de shopify, porque lo utilizaremos para formar la URL)
  shopify.getUnfulfilledOrdersAndSendToWebService('printalot-es');
});


//Tienda nueva
router.post('/ami-iyok/orders/', (req, res) => {
  console.log('POST request to ' + '/ami-iyok/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
  // Lamar al metodo y pasar como parametro la tienda(es importante que el nombre da la tienda coincida con el nombre en la URL de la tienda de shopify, porque lo utilizaremos para formar la URL)
  shopify.handleWebhook({ tipo: 'orders', req, res, store: 'ami-iyok' });
});

// Hacer consulta a todos los pedidos anteriores y hacer POST al webservice
router.get('/ami-iyok/orders/unfulfilled/', (req, res) => {
  console.log('GET request to ' + 'shopify' + '/ami-iyok/orders/unfulfilled/');
  res.send('GET request to ' + 'shopify' + '/ami-iyok/orders/unfulfilled/');
  // Lamar al metodo y pasar como parametro la tienda(es importante que el nombre da la tienda coincida con el nombre en la URL de la tienda de shopify, porque lo utilizaremos para formar la URL)
  shopify.getUnfulfilledOrdersAndSendToWebService('ami-iyok');
});

// Cuando el ABC haga post se ejecutara esta funcion para modificar la API de shopify
router.post( '/shipments/', (req, res) => {
  console.log('POST request to ' + '/shipments/');
  // Obtenemos el nombre de la store atraves del idcustomer
  const store = obtenerCodigoSesionCliente(req.body);
  shopifyAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store: store });
});

router.post( '/ami-iyok/shipments/', (req, res) => {
  console.log('POST request to ' + '/shipments/');
  // Obtenemos el nombre de la store atraves del idcustomer
  const store = obtenerCodigoSesionCliente(req.body);
  shopifyAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store: store });
});




// Funcion para que segun que id customer venga escoja una tienda o otra
function obtenerCodigoSesionCliente(reqBody) {
  const idCustomerArray = reqBody.pedidos?.pedido?.[0]?.idcustomer || [];
  // Verifica si PRINTALOT_IDCUSTOMER está presente en el arreglo
  const isPrintalotCustomer = idCustomerArray.includes(process.env.PRINTALOT_IDCUSTOMER);
  const isAmiiyokCustomer = idCustomerArray.includes(process.env.AMI-IYOK_IDCUSTOMER);
  // Agrega más casos según los tipos de tiendas en tu .env
  if (isPrintalotCustomer) {
    return 'printalot-es';
  }
  else if (isAmiiyokCustomer) {
    return 'ami-iyok';
  }
  return 'default';
}


module.exports = router;
