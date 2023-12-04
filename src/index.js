// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { initWebhooks, initQueueProcessor } = require('./shopify.js');

// Importa el middleware de GLS
const { glsMiddleware } = require('./GLS');

const app = express();
const port = 3000;

app.use(bodyParser.text({ type: 'application/xml' }));
app.use(cors());

// Shopify
// Inicializar webhooks, cola de trabajo y procesador
initWebhooks(app);
initQueueProcessor();

// GLS
app.use(glsMiddleware);

// Puerto donde estará escuchando el servidor los webhooks
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
