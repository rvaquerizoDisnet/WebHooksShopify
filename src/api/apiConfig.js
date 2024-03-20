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


router.get('/configuracion', verificarToken, async (req, res) => {
    try {
        // Establece una conexión a la base de datos
        const pool = await connectToDatabase(2);
        // Crea un nuevo objeto de solicitud utilizando la conexión
        const request = pool.request();
        // Ejecuta la consulta utilizando la solicitud
        const queryResult = await request.query('SELECT * FROM MWDashboard');
        res.json(queryResult.recordset); // Enviar los datos obtenidos como respuesta
    } catch (error) {
        console.error('Error al obtener la configuración:', error);
        res.status(500).send('Error interno del servidor.');
    }
});

router.post('/configuracion', verificarToken, async (req, res) => {
    try {
        const configData = req.body;
        // Itera sobre los datos recibidos y actualiza la base de datos para cada registro
        for (const config of configData) {
            const { nave, pedidos, reubicaciones, mensaje } = config;
            await updateConfigDB(nave, pedidos, reubicaciones, mensaje);
        }

        res.sendStatus(200); // Enviar respuesta exitosa
    } catch (error) {
        console.error('Error al guardar la configuración:', error);
        res.status(500).send('Error interno del servidor.');
    }
});



module.exports = { router };
