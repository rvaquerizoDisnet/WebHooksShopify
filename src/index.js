const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api/api');
const glsRouter = require('./api/apiGLSRouter');
const usersRouter = require('./users/usersRouter');
const homeRouter = require('./api/home');
const shopify = require('./shopify/shopify');
const { errorHandlingMiddleware } = require('./autenticacion/errorHandlingMiddleware');
require('dotenv').config();
const { connectToDatabase, closeDatabaseConnection } = require('./utils/database'); 
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar la API en el servidor principal
app.use('/shopify', apiRouter);
app.use('/gls', glsRouter);
app.use('/users', usersRouter);
app.use('/', homeRouter);

app.use(errorHandlingMiddleware);


// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública
shopify.initWebhooks(app, providedUrl);



// Configurar CORS
app.use(cors());

const server = app.listen(port, async () => {
  try {
    // Conectarse a la base de datos al iniciar el servidor
    const pool = await connectToDatabase();
    console.log(`Servidor escuchando en http://localhost:${port}`);

    // Ejecutar la consulta a la base de datos
    const result = await pool.request().query('SELECT * FROM MiddlewareWooCommerce');

    // Registrar los resultados en el log
    console.log('Resultados de la consulta:');
    console.log(result.recordset);

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