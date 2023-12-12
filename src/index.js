// index.js
const express = require('express');
const bodyParser = require('body-parser');
const ngrok = require('ngrok');
const apiRouter = require('./api');
const shopify = require('./shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar la API en el servidor principal
app.use('/', apiRouter);

// Inicializar los endpoints
shopify.initWebhooks(app);

// Iniciar el servidor principal
const server = app.listen(port, async () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);

  // Abrir ngrok y obtener la URL pública
  try {
    const ngrokUrl = await ngrok.connect(port);
    console.log(`Ngrok URL: ${ngrokUrl}`);
    
    // Inicializar los endpoints con la URL pública de ngrok
    shopify.initWebhooks(app, ngrokUrl);
  } catch (error) {
    console.error('Error al iniciar ngrok:', error);
    process.exit(1);
  }
});

// Manejar eventos de cierre para cerrar correctamente ngrok
process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      console.log('Servidor cerrado.');
      process.exit(0);
    });
  }
  
  if (ngrok) {
    ngrok.disconnect();
  }
});
