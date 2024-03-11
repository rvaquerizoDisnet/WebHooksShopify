/*const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const shopify = require('../magento/magento');
const shopifyAPI = require('../magento/magentoAPI');
const xmlparser = require('express-xml-bodyparser');
const util = require('util');
const db = require('../utils/database');
const { connectToDatabase } = require('../utils/database');
const { pool, sql, connectToDatabase2 } = require('../utils/database2');
const path = require('path')
router.use(bodyParser.json());
const { insertIntoDB, updateClientInDB, deleteClientFromDB } = require('../utils/insertClientMagento');
router.use(xmlparser());
const { verificarToken } = require('../autenticacion/authenticationMiddleware');

router.get('/', verificarToken, (req, res) => {
  // Utiliza el método sendFile para enviar el archivo HTML
  res.sendFile(path.join(__dirname, '../htmls/magento.html'));
});

// Ruta GET para abrir el formulario HTML addcustomermagento.html
router.get('/nuevo-cliente', verificarToken, (req, res) => {
    // Construye la ruta absoluta al archivo addcustomermagento.html
    const htmlFilePath = path.join(__dirname, '../htmls/addcustomermagento.html');
    // Envía el archivo como respuesta
    res.sendFile(htmlFilePath);
  });

// Ruta POST para procesar el formulario
router.post('/post', verificarToken, async (req, res) => {
    const { NombreEndpoint, UrlTienda, UrlWebService, ApiKey, ConsumerKey, ConsumerSecret, AccessToken, AccessTokenSecret, IdCustomer, SessionCode, TransportCompany } = req.body;
    try {
      await insertIntoDB(NombreEndpoint, UrlTienda, UrlWebService, ApiKey, ConsumerKey, ConsumerSecret, AccessToken, AccessTokenSecret, IdCustomer, SessionCode, TransportCompany);
      res.redirect(`/magento/`);
    } catch (error) {
      console.error('Error al agregar el cliente:', error);
      res.status(500).send('Error interno del servidor.');
    }
  });

  router.get('/clientes', verificarToken, async (req, res) => {
    try {
      const pool = await connectToDatabase2();
      const request = pool.request();
      const query = `
        SELECT * FROM MiddlewareMagento;
      `;
      const result = await request.query(query);
      res.json(result.recordset);
    } catch (error) {
      console.error('Error al obtener clientes de la base de datos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  
  // Ruta PUT para editar un cliente
  router.put('/clientes/:id/edit', verificarToken, async (req, res) => {
    const clientId = req.params.id;
    const { NombreEndpoint, UrlTienda, UrlWebService, IdCustomer, SessionCode, TransportCompany } = req.body;
    try {
      await updateClientInDB(clientId, UrlTienda, NombreEndpoint, UrlWebService, IdCustomer, SessionCode, TransportCompany);
      res.send('Cliente actualizado correctamente');
    } catch (error) {
      console.error('Error al editar el cliente:', error);
      res.status(500).send('Error interno del servidor.');
    }
  });
  
  // Ruta DELETE para eliminar un cliente
  router.delete('/clientes/:id', verificarToken, async (req, res) => {
    const clientId = req.params.id;
  
    try {
      await deleteClientFromDB(clientId);
      res.send('Cliente eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar el Cliente:', error);
      res.status(500).send('Error interno del servidor.');
    }
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
    const query = 'SELECT * FROM MiddlewareMagento';
    const result = await db.executeQuery(query);
    return result.recordset;
  } catch (error) {
    console.error('Error al obtener la configuración de las tiendas de Magento:', error);
    throw error;
  }
}



// Función para obtener el nombre de la tienda desde la base de datos por IdCustomer
async function obtenerCodigoSesionCliente(reqBody) {
  try {
    const idCustomerArray = reqBody.pedidos?.pedido?.[0]?.idcustomer || [];

    const pool = await db.connectToDatabase2();
    const request = pool.request();

    const result = await request.query('SELECT IdCustomer, NombreEndpoint FROM MiddlewareMagento');
    const tiendas = result.recordset;


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

module.exports = { router, initDynamicEndpoints, obtenerConfiguracionesTiendas };*/