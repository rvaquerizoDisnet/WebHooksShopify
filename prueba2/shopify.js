// shopify.js
const crypto = require('crypto');

const shopify = {
  handleWebhook: (req, res) => {
    // Verificar firma del webhook
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const body = JSON.stringify(req.body);

    const secret = 'tu_secreto_compartido_con_Shopify'; // Reemplazar con tu secreto compartido
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

    if (hash === hmacHeader) {
      // Firma válida, procesa el pedido
      const order = req.body;
      console.log('Pedido recibido:', order);

      // Aquí puedes agregar la lógica para procesar el pedido y encolar el trabajo

      res.status(200).send('Webhook recibido correctamente');
    } else {
      // Firma no válida
      console.error('Firma no válida. El webhook no proviene de Shopify.');
      res.status(401).send('Firma no válida');
    }
  },
};

module.exports = shopify;
