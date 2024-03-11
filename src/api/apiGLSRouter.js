const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { insertIntoDB, updateClientInDB, deleteClientFromDB, insertIntoDBCli } = require('../utils/insertClientGLS');
const { verificarToken } = require('../autenticacion/authenticationMiddleware');
const { connectToDatabase } = require('../utils/database');

const router = express.Router();

// Configuración de body-parser
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Ruta GET para servir el formulario HTML
router.get('/', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo gls.html
  const htmlFilePath = path.join(__dirname, '../htmls/gls.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta GET para servir el formulario HTML
router.get('/remitentes', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo gls.html
  const htmlFilePath = path.join(__dirname, '../htmls/glsRemitentes.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta GET para abrir el formulario HTML addcustomergls.html
router.get('/nuevo-cliente', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo addcustomergls.html
  const htmlFilePath = path.join(__dirname, '../htmls/addcustomergls.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta GET para abrir el formulario HTML addcustomergls.html
router.get('/nuevo-correo', verificarToken, (req, res) => {
  // Construye la ruta absoluta al archivo addcustomergls.html
  const htmlFilePath = path.join(__dirname, '../htmls/addClientGLS.html');
  // Envía el archivo como respuesta
  res.sendFile(htmlFilePath);
});

// Ruta POST para procesar el formulario
router.post('/post', verificarToken, async (req, res) => {
  const { Nombre, uid_cliente, departamento_exp } = req.body;
  try {
    await insertIntoDB(Nombre, uid_cliente, departamento_exp);
    res.redirect(`/gls/`);
  } catch (error) {
    console.error('Error al agregar el cliente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

// Ruta POST para procesar el formulario
router.post('/remitente/post', verificarToken, async (req, res) => {
  const { Nombre, uid_cliente, departamento_exp } = req.body;
  try {
    await insertIntoDBCli(Nombre, uid_cliente, departamento_exp);
    res.redirect(`/gls/`);
  } catch (error) {
    console.error('Error al agregar el cliente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

router.get('/clientes', verificarToken, async (req, res) => {
  try {
    const pool = await connectToDatabase(2);
    const request = pool.request();
    const query = `
      SELECT * FROM MiddlewareGLS;
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
  const { Nombre, uid_cliente, departamento_exp } = req.body;

  try {
    await updateClientInDB(Nombre, uid_cliente, departamento_exp, clientId);
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


router.get('/remitentes2', verificarToken, async (req, res) => {
  try {
    const pool = await connectToDatabase(2);
    const request = pool.request();
    const query = `
      SELECT * FROM MwClientesGLS;
    `;
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener remitentes de la base de datos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta PUT para editar un cliente
router.put('/remitentes/:id/edit', verificarToken, async (req, res) => {
  const clientId = req.params.id;
  const { Departamento, Correo } = req.body;

  try {
    await updateClientInDB(Departamento, Correo);
    res.send('remitente actualizado correctamente');
  } catch (error) {
    console.error('Error al editar el remitente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});

// Ruta DELETE para eliminar un cliente
router.delete('/remitentes/:id', verificarToken, async (req, res) => {
  const clientId = req.params.id;

  try {
    await deleteClientFromDB(clientId);
    res.send('remitente eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el remitente:', error);
    res.status(500).send('Error interno del servidor.');
  }
});



module.exports = router;