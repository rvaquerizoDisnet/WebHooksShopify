const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const shopify = require('./shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Montar la API en el servidor principal
app.use('/', apiRouter);

// Obtener la URL pública proporcionada
const providedUrl = process.env.YOUR_PROVIDED_URL;

// Inicializar los endpoints con la URL pública 
shopify.initWebhooks(app, providedUrl);

// Configurar opciones para HTTPS
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/tudominio.com/privkey.pem'), // Ruta al archivo de clave privada generada por Certbot
  cert: fs.readFileSync('/etc/letsencrypt/live/tudominio.com/fullchain.pem'), // Ruta al archivo de certificado completo generada por Certbot
}

// Crear servidor HTTPS
const server = https.createServer(options, app);

// Iniciar el servidor principal
server.listen(port, () => {
  console.log(`Servidor escuchando en https://localhost:${port}`);
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
