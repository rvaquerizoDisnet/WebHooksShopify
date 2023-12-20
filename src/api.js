// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('./shopify');
const shopifyAPI = require('./shopifyAPI');

// Middleware para parsear el cuerpo de las solicitudes en formato JSON
router.use(bodyParser.json());

// Endpoint de prueba
router.get('/prueba', (req, res) => {
  console.log('GET request to /prueba/');
  res.status(200).send('OK');
});

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


router.post('/shopify-webhook/shipments/', (req, res) => {
  console.log('POST request to /shopify-webhook/shipments/', req.body);
   // Obtener el código de Sesion_Cliente
   const storeCode = obtenerCodigoSesionCliente(req.body);
  // Llama a la función handleWebhook del módulo shopifyAPI.js
  shopifyAPI.handleShipment({ tipo: 'shipments', req, res, store: storeCode });
  res.json({ message: 'Shipment request received successfully' });
});


module.exports = router;
