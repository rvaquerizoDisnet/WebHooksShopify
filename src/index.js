// index.js
const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const shopify = require('./shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar el router en el servidor principal
app.use('/', apiRouter);

// Inicializar webhooks con la URL del servidor
const serverUrl = 'https://shopify.disnet.es';
shopify.initWebhooks(app, serverUrl);

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
