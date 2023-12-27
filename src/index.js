const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const shopify = require('./shopify');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar la API en el servidor principal
app.use('/', apiRouter);

// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública
shopify.initWebhooks(app, providedUrl);

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

/*
const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const shopify = require('./shopify');
const cors = require('cors');
const ngrok = require('ngrok');
const xmlparser = require('express-xml-bodyparser');

const app = express();
const port = process.env.PORT || 3001;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(xmlparser());
app.use(bodyParser.text({ type: 'application/xml' }));


// Montar la API en el servidor principal
app.use('/', apiRouter);

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

    // Configurar CORS después de inicializar los webhooks
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
  } catch (error) {
    console.error('Error al conectar con Ngrok:', error);
  }
})();
*/