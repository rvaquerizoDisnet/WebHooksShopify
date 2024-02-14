const express = require('express');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const apiRouter = require('./api/api');
const glsRouter = require('./api/apiGLSRouter');
const usersRouter = require('./users/usersRouter');
const homeRouter = require('./api/home');
const shopify = require('./shopify/shopify');
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();
const newCustomerRouter = require('./api/newCustomer');
const db = require('./utils/database');
const expressJwt = require('express-jwt');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;
const { obtenerConfiguracionesTiendas } = require('./api/api');
const cookieParser = require('cookie-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(xmlparser());
app.use(bodyParser.text({ type: 'application/xml' }));
app.use(cookieParser())


// Montar la API en el servidor principal
app.use('/shopify', apiRouter.router);
app.use('/gls', glsRouter);
app.use('/users',  usersRouter);
app.use('/', homeRouter);
app.use('/nuevo-cliente', newCustomerRouter);


const obtenerRutasDinamicas = async () => {
  const dynamicRoutes = [];

  const stores = await obtenerConfiguracionesTiendas();

  stores.forEach(store => {
    const rutaWebhook = `/${store.NombreEndpoint}/orders`;
    dynamicRoutes.push(rutaWebhook);
    const rutaShipments = `/${store.NombreEndpoint}/shipments/`;
    dynamicRoutes.push(rutaShipments);
  });

  return dynamicRoutes;
};

const getProtectedRoutes = async () => {
  const protectedRoutes = await obtenerRutasDinamicas();
  return protectedRoutes;
};

// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública
shopify.initWebhooks(app, providedUrl);

apiRouter.initDynamicEndpoints();  

// Configurar CORS
app.use(cors());

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
app.use(errorHandlingMiddleware);
