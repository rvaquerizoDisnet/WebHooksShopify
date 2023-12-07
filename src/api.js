const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint para solicitudes GET en /shopify-webhook/orders/
app.get('/shopify-webhook/orders/', (req, res) => {
  res.send('GET request to /shopify-webhook/orders/');
});

// Endpoint para solicitudes POST en /shopify-webhook/orders/
app.post('/shopify-webhook/orders/', (req, res) => {
  // Manejo de la solicitud POST
  console.log('POST request to /shopify-webhook/orders/', req.body);
  res.json({ message: 'POST request received successfully' });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en https://shopify.disnet.es:${port}`);
});
