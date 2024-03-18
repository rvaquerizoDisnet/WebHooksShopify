const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const xmlparser = require('express-xml-bodyparser');
const db = require('../utils/database');
const { connectToDatabase } = require('../utils/database');
const path = require('path');
const { updateConfigDB } = require('../utils/config');
const { verificarToken } = require('../autenticacion/authenticationMiddleware');

router.use(bodyParser.json());
router.use(xmlparser());

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo gls.html
  const htmlFilePath = path.join(__dirname, '../htmls/config.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});


router.post('/', verificarToken, async (req, res) => {
    try {
        const { nave, pedidos, reubicaciones, mensaje } = req.body;

        // Llama a la función para actualizar la configuración en la base de datos
        await updateConfigDB(nave, pedidos, reubicaciones, mensaje);

        // Redirecciona al usuario a la página de configuración después de guardar la configuración
        res.redirect('/');

    } catch (error) {
        console.error('Error al actualizar la configuración:', error);
        res.status(500).send('Error interno del servidor.');
    }
});


// Ruta PUT para editar un cliente
router.put('/:id/edit', verificarToken, async (req, res) => {
  const clientId = req.params.id;
  const { NombreEndpoint, UrlWebService, IdCustomer, SessionCode, TransportCompany } = req.body;
  try {
    await updateConfigDB(clientId, NombreEndpoint, UrlWebService, IdCustomer, SessionCode, TransportCompany);
    res.send('Cliente actualizado correctamente');
  } catch (error) {
    console.error('Error al editar el cliente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

// Ruta GET para obtener la configuración desde la base de datos
router.get('/configuracion', async (req, res) => {
    try {
        const queryResult = await db.query('SELECT * FROM MWPantallas');
        res.json(queryResult.recordset); // Enviar los datos obtenidos como respuesta
    } catch (error) {
        console.error('Error al obtener la configuración:', error);
        res.status(500).send('Error interno del servidor.');
    }
});

// Ruta POST para guardar la configuración en la base de datos
router.post('/configuracion', async (req, res) => {
    try {
        const { nave, pedidos, reubicaciones, mensaje } = req.body;

        // Realizar las operaciones necesarias para guardar la configuración en la base de datos

        res.sendStatus(200); // Enviar respuesta exitosa
    } catch (error) {
        console.error('Error al guardar la configuración:', error);
        res.status(500).send('Error interno del servidor.');
    }
});


module.exports = { router };
