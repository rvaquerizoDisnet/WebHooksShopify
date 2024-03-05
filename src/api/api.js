// api.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('../shopify/shopify');
const shopifyAPI = require('../shopify/shopifyAPI');
const xmlparser = require('express-xml-bodyparser');
const util = require('util');
const db = require('../utils/database');
const path = require('path')
router.use(bodyParser.json());
router.use(xmlparser());
const { verificarToken } = require('../autenticacion/authenticationMiddleware');


router.get('/clientes/', verificarToken, (req, res) => {
  // Envía un mensaje junto con el archivo HTML utilizando el método send
  // Utiliza el método sendFile para enviar el archivo HTML
  res.sendFile(path.join(__dirname, '../htmls/shopify.html'));
  res.status(200)
});



async function initDynamicEndpoints() {
  const stores = await obtenerConfiguracionesTiendas();
  stores.forEach(store => {
    const rutaWebhook = `/${store.NombreEndpoint}/`;

    // Configurar el endpoint para manejar pedidos POST
    router.post(`${rutaWebhook}orders`, async (req, res) => {
        console.log('POST request to ' + '/orders/');
        res.json({ message: 'POST request received successfully' });
        const jobData = { tipo: 'orders', req, res, store: store.NombreEndpoint };
        await shopify.handleWebhook(jobData);
    });

    // Configurar el endpoint para obtener pedidos no cumplidos
    router.get(`${rutaWebhook}orders/unfulfilled`, verificarToken, async (req, res) => {
      console.log("unfulfilled")
      await shopify.getUnfulfilledOrdersAndSendToWebService(store.NombreEndpoint);
    });

    // Configurar el endpoint para obtener pedidos no cumplidos
    router.post(`${rutaWebhook}orders/canceled`, async (req, res) => {
      console.log('POST request to ' + '/orders/canceled');
      res.json({ message: 'POST request received successfully' });
      //llamar a la logica para cancelar pedidos
    });

    // Configurar el endpoint para manejar envíos POST
    router.post(`${rutaWebhook}shipments`, async (req, res) => {
        const store = await obtenerCodigoSesionCliente(req.body);
        await shopifyAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store });
    });
  });
}



// Función para obtener la configuración de la tienda desde la base de datos
async function obtenerConfiguracionesTiendas() {
  try {
    const query = 'SELECT * FROM MiddlewareShopify';
    const result = await db.executeQuery(query);
    return result.recordset;
  } catch (error) {
    console.error('Error al obtener la configuración de las tiendas de Shopify:', error);
    throw error;
  }
}



// Función para obtener el nombre de la tienda desde la base de datos por IdCustomer
async function obtenerCodigoSesionCliente(reqBody) {
  try {
    const idCustomerArray = reqBody.pedidos?.pedido?.[0]?.idcustomer || [];

    const pool = await db.connectToDatabase();
    const request = pool.request();

    const result = await request.query('SELECT IdCustomer, NombreEndpoint FROM MiddlewareShopify');
    const tiendas = result.recordset;

    //await db.closeDatabaseConnection(pool);

    for (const idCustomer of idCustomerArray) {
      const tienda = tiendas.find(t => t.IdCustomer == idCustomer);

      if (tienda) {
        return tienda.NombreEndpoint;
      }
    }

    return 'default';
  } catch (error) {
    console.error('Error al obtener la tienda desde la base de datos por IdCustomer:', error);
    throw error;
  }
}

module.exports = { router, initDynamicEndpoints, obtenerConfiguracionesTiendas };