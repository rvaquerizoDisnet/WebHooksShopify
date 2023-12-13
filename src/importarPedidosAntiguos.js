// importaciones necesarias
const axios = require('axios');
const shopify = require('./shopify');

// Archivo para importar pedidos antiguos
const importOldOrders = async () => {
  try {
    const store = 'printalot'; // Cambia esto según tu configuración
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Agrega tu token de acceso de Shopify

    // Consultar pedidos antiguos con fulfillment_status como 'unfulfilled'
    const response = await axios.get(`https://${store}.myshopify.com/admin/api/2023-01/orders.json?fulfillment_status=unfulfilled`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    });

    const orders = response.data.orders;

    // Procesar cada pedido
    for (const order of orders) {
      const jobData = { tipo: 'orders', req: { body: order }, res: { status: () => {}, send: () => {} }, store };
      await shopify.handleWebhook(jobData);
    }

    console.log('Importación de pedidos antiguos completada');
  } catch (error) {
    console.error('Error al importar pedidos antiguos:', error);
  }
};

// Ejecutar la importación de pedidos antiguos al iniciar la aplicación
importOldOrders();

module.exports = importOldOrders;
