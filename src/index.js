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
const magentoRouter = require('./api/apiMagento');
const magento = require('./magento/magento');
const newCustomerRouter = require('./api/newCustomer');
const configRouter = require('./api/apiConfig')
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3001;
const cookieParser = require('cookie-parser');
const { consultarPedidoGLS, cronGLS, consultarIncidenciasYPesos } = require('./gls/glsService');
const { convertTableToCSV, deleteCSVFile} = require('./gls/convertMDBinSQLite');
const { cronUPS } = require('./ups/ups');
const { crondhl } = require('./dhl/dhl');
const { cronCorreos } = require('./correos/correos');
//const { generarExcel } = require('./preentradas/preentradasBAY'); //TODO Descomentar esto

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
app.use('/config', configRouter.router)
//app.use('/magento', magentoRouter.router)

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


//magento.initWebhooks(app, providedUrl);

//magentoRouter.initDynamicEndpoints();

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

// Manejar eventos de cierre para cerrar correctamente el servidor y la conexión a la base de datos
process.on('SIGTERM', () => {
  if (server) {
    server.close(async () => {
      console.log('Servidor cerrado.');
      process.exit(0);
    });
  }
});

//generarExcel(); // TODO Generar preentrada esta tarde a las 18:00
// Llamada a las tareas automaticas por Cron 

//GLS
convertTableToCSV();
deleteCSVFile();
cronGLS();
//incidencias
consultarIncidenciasYPesos();

//UPS
cronUPS();

//Correos
cronCorreos();

//DHL
crondhl();
