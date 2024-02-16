const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const xmlparser = require('express-xml-bodyparser');
const apiRouter = require('./api/api');
const glsRouter = require('./api/apiGLSRouter');
const usersRouter = require('./users/usersRouter');
const homeRouter = require('./api/home');
const shopify = require('./shopify/shopify');
const woocommerce = require('./WooCommerce/WooCommerceWB');
const woocommerceRouter = require('./api/ApiWooCommerce');
const newCustomerRouter = require('./api/newCustomer');
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();
const { connectToDatabase, closeDatabaseConnection } = require('./utils/database'); 
const app = express();
const port = process.env.PORT || 3001;
const { obtenerConfiguracionesTiendas } = require('./api/api');
const cookieParser = require('cookie-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(xmlparser());
app.use(bodyParser.text({ type: 'application/xml' }));

app.use(cookieParser());

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


app.use('/shopify', apiRouter.router);
app.use('/gls', glsRouter);
app.use('/users',  usersRouter);
app.use('/', homeRouter);
app.use('/nuevo-cliente', newCustomerRouter);
app.use('/woocommerce', woocommerceRouter.router)

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    // Construye el mensaje de error con encodeURIComponent para codificar los caracteres especiales
    const errorMessage = encodeURIComponent('Se requiere iniciar sesión para acceder a esta ruta.');

    // Redirige al usuario a la página de inicio de sesión con el mensaje de error en la URL
    res.redirect(`/users/login?error=${errorMessage}`);
  } else {
    next(err);
  }
});


// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública
shopify.initWebhooks(app, providedUrl);

apiRouter.initDynamicEndpoints();  

woocommerce.initWebhooks(app, providedUrl);

woocommerceRouter.initDynamicEndpoints();

// Configurar CORS
app.use(cors());

app.use(errorHandlingMiddleware);

const server = app.listen(port, async () => {
  try {
    // Conectarse a la base de datos al iniciar el servidor
    const pool = await connectToDatabase();
    console.log(`Servidor escuchando en http://localhost:${port}`);

  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
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



