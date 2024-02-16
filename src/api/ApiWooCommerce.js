// apiWooCommerce.js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const woocommerce = require('../WooCommerce/WooCommerceWB');
const woocommerceAPI = require('../WooCommerce/WooCommerceAPI');
const xmlparser = require('express-xml-bodyparser');
const db = require('../utils/database');
const { connectToDatabase } = require('../utils/database');
const path = require('path');
const { insertIntoDB, updateClientInDB, deleteClientFromDB } = require('../utils/insertClientWooCommerce');
const { verificarToken } = require('../autenticacion/authenticationMiddleware');

router.use(bodyParser.json());
router.use(xmlparser());

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo gls.html
  const htmlFilePath = path.join(__dirname, '../htmls/woocommerce.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta GET para abrir el formulario HTML addcustomergls.html
router.get('/nuevo-cliente', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo addcustomergls.html
  const htmlFilePath = path.join(__dirname, '../htmls/addcustomerwoocommerce.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta POST para procesar el formulario
router.post('/post', verificarToken, async (req, res) => {
  const { NombreEndpoint, UrlWebService, ApiKey, ApiSecret, IdCustomer, SessionCode, TransportCompany } = req.body;
  try {
    await insertIntoDB(NombreEndpoint, UrlWebService, ApiKey, ApiSecret, IdCustomer, SessionCode, TransportCompany);
    res.redirect(`/woocommerce/`);
  } catch (error) {
    console.error('Error al agregar el cliente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

router.get('/clientes', verificarToken, async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    const query = `
      SELECT * FROM MiddlewareWooCommerce;
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
  const { NombreEndpoint, UrlWebService, IdCustomer, SessionCode, TransportCompany } = req.body;
  try {
    await updateClientInDB(clientId, NombreEndpoint, UrlWebService, IdCustomer, SessionCode, TransportCompany);
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
  console.log("Ha llegado a initDynamicEndpoints")
  const stores = await obtenerConfiguracionesTiendas();
  console.log("Configuraciones de tiendas:", stores);
  stores.forEach(store => {
    const webhookRoute = `/${store.NombreEndpoint}/`;

    // Configura el endpoint para manejar pedidos POST
    router.post(`${webhookRoute}orders`, async (req, res) => {
      try {
        const jobData = { tipo: 'orders', req, res, store: store.NombreEndpoint };
        //await woocommerce.handleWebhook(jobData);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error al procesar el webhook:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // Configurar el endpoint para obtener pedidos no cumplidos
    router.get(`${webhookRoute}orders/unfulfilled`, async (req, res) => {
        try {
            //await woocommerce.getUnfulfilledOrdersAndSendToWebService(store.NombreEndpoint);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error al obtener pedidos no cumplidos o enviar al webservice:', error);
            res.status(500).send('Internal Server Error');
        }
        });
    
        // Configurar el endpoint para manejar envíos POST
        router.post(`${webhookRoute}shipments`, async (req, res) => {
        try {
            const store = await obtenerCodigoSesionCliente(req.body);
            //await woocommerceAPI.handleShipmentAdminApi({ tipo: 'shipments', req, res, store });
        } catch (error) {
            console.error('Error al procesar el envío:', error);
            res.status(500).send('Internal Server Error');
        }
        });

  });
}

async function obtenerConfiguracionesTiendas() {
  try {
    const query = 'SELECT * FROM MiddlewareWooCommerce';
    console.log("Query:", query); // Agregar esta línea para verificar la consulta SQL
    
    const result = await db.executeQuery(query);
    console.log("Resultado de la consulta:", result); // Agregar esta línea para verificar el resultado de la consulta

    return result.recordset;
  } catch (error) {
    console.error('Error al obtener la configuración de las tiendas de WooCommerce:', error);
    throw error;
  }
}


// Función para obtener el nombre de la tienda desde la base de datos por IdCustomer
async function obtenerCodigoSesionCliente(reqBody) {
    try {
      const idCustomerArray = reqBody.pedidos?.pedido?.[0]?.idcustomer || [];
  
      const pool = await db.connectToDatabase();
      const request = pool.request();
  
      const result = await request.query('SELECT IdCustomer, NombreEndpoint FROM MiddlewareWooCommerce');
      const tiendas = result.recordset;
  
      await db.closeDatabaseConnection(pool);
  
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
