/*const express = require('express');
const bodyParser = require('body-parser');
const { router, initDynamicEndpoints } = require('./api/api');
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar la API en el servidor principal
app.use('/shopify', apiRouter);
app.use('/gls', glsRouter);
app.use('/users', usersRouter);
app.use('/', homeRouter);
app.use('/nuevo-cliente', newCustomerRouter);

app.use(errorHandlingMiddleware);


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
*/
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ngrok = require('ngrok');
const xmlparser = require('express-xml-bodyparser');
const apiRouter = require('./api/api');
const glsRouter = require('./api/apiGLSRouter');
const usersRouter = require('./users/usersRouter');
const homeRouter = require('./api/home');
const shopify = require('./shopify/shopify');
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();
const { consultarPedidoGLS } = require('./gls/glsService');
const newCustomerRouter = require('./api/newCustomer');
const db = require('./utils/database');
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

// Inicializar los endpoints con la URL pública usando ngrok
(async () => {
  try {
    const url = await ngrok.connect({
      addr: port,
      region: 'eu', // Puedes cambiar la región según tu ubicación
    });

    console.log('Ngrok URL:', url);

    // Pasar la URL proporcionada por ngrok para inicializar los webhooks
    shopify.initWebhooks(app, url);

    apiRouter.initDynamicEndpoints();

    // Configurar CORS después de inicializar los webhooks
    app.use(cors());



    //GLS consulta pedido
    //const uidClientePrueba = "6BAB7A53-3B6D-4D5A-9450-702D2FAC0B11";
    //const codigoPedido = "2ab821a4-a5c9-46e9-9fd1-1226af825585"; 
    //await consultarPedidoGLS(uidClientePrueba, codigoPedido);

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
  } catch (error) {
    console.error('Error al conectar con Ngrok:', error);
  }
})();

app.use(errorHandlingMiddleware);
