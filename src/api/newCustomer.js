const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { insertIntoDB, updateClientInDB, deleteClientFromDB } = require('../utils/insertClient');
const { verificarToken } = require('../autenticacion/authenticationMiddleware');
const { connectToDatabase } = require('../utils/database');

const router = express.Router();

// Configuración de body-parser
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Ruta GET para servir el formulario HTML
router.get('/', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo addcustomer.html
  const htmlFilePath = path.join(__dirname, '../htmls/addcustomer.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta POST para procesar el formulario
router.post('/post', verificarToken, async (req, res) => {
  const { NombreEndpoint, UrlWebService, ApiKey, ApiSecret, AccessToken, IdCustomer, SessionCode, TransportCompany } = req.body;
  try {
    await insertIntoDB(NombreEndpoint, UrlWebService, ApiKey, ApiSecret, AccessToken, IdCustomer, SessionCode, TransportCompany);
    res.redirect(`/shopify/clientes/`);
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
      SELECT * FROM MiddlewareShopify;
    `;
    const result = await request.query(query);
    res.json(result.recordset);
    console.log(res.json)
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
    console.error('Error al eliminar el cliente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});


module.exports = router;