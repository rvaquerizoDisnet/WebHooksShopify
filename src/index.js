const express = require('express');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const { connectToDatabase } = require('./utils/database');
const apiRouter = require('./api/api');
const glsRouter = require('./api/apiGLSRouter');
const usersRouter = require('./users/usersRouter');
const homeRouter = require('./api/home');
const shopify = require('./shopify/shopify');
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();

const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS
app.use(cors());

// Middleware para parsear JSON y XML
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(xmlparser());

// Middleware para manejo de errores
app.use(errorHandlingMiddleware);

// Montar las rutas
app.use('/shopify', apiRouter);
app.use('/gls', glsRouter);
app.use('/users', usersRouter);
app.use('/', homeRouter);

// Conectar a la base de datos
//connectToDatabase();

// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública
shopify.initWebhooks(app, providedUrl);

// Iniciar el servidor principal
const server = app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Manejar eventos de cierre para cerrar correctamente el servidor
process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      console.log('Servidor cerrado.');
      process.exit(0);
    });
  }
});
