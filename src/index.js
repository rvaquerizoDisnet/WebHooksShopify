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
const app = express();
const port = process.env.PORT || 3001;
const cookieParser = require('cookie-parser');
const { obtenerConfiguracionesTiendas } = require('./api/api');
const { consultaAGls, consultarPedidoGLS } = require('./gls/glsService');
const { convertTableToCSV, deleteCSVFile } = require('./gls/convertMDBinSQLite');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(xmlparser());
app.use(bodyParser.text({ type: 'application/xml' }));

app.use(cookieParser());


app.use('/shopify', apiRouter.router);
app.use('/gls', glsRouter);
app.use('/users', usersRouter);
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

shopify.initWebhooks(app, providedUrl);

apiRouter.initDynamicEndpoints();

woocommerce.initWebhooks(app, providedUrl);

woocommerceRouter.initDynamicEndpoints();

// Configurar CORS
app.use(cors());

app.use(errorHandlingMiddleware);

let server;

const startServer = async () => {
  try {
    // Conectarse a la base de datos al iniciar el servidor
    server = app.listen(port, () => {
      console.log(`Servidor escuchando en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();

//consultarPedidoGLS("cb4b925e-5fee-4ac8-8f25-94114369592d", '2000046879', 930348197)

// Manejar eventos de cierre para cerrar correctamente el servidor y la conexión a la base de datos
process.on('SIGTERM', () => {
  if (server) {
    server.close(async () => {
      console.log('Servidor cerrado.');
      process.exit(0);
    });
  }
});


// Llamada a las tareas automaticas por Cron
//convertTableToCSV();
//deleteCSVFile();
//consultaAGls();