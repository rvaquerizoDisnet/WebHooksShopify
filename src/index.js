// index.js
const express = require('express');
const bodyParser = require('body-parser');
const shopify = require('./shopify');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint para recibir webhooks de Shopify
app.post('/', shopify.handleWebhook);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
