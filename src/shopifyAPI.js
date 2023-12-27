const xml2js = require('xml2js');
const axios = require('axios');
require('dotenv').config();

async function handleShipmentAdminApi({ req, res, store }) {
  let successMessage = 'Solicitud de envío procesada correctamente';

  try {
    const xmlData = req.body;

    const pedido = xmlData?.pedido;
    if (!pedido || !pedido.ordernumber || !pedido.trackingnumber) {
      return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML.' });
    }

    const orderNumber = pedido.ordernumber[0];
    const trackingNumber = pedido.trackingnumber[0];

    const adminApiKey = process.env[`SHOPIFY_API_KEY_${store.toUpperCase()}`];
    const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${store.toUpperCase()}`];

    if (!adminApiKey || !adminApiAccessToken) {
      return res.status(500).json({ error: 'API key o token de acceso no configurados correctamente.' });
    }

    const shopifyApiUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders.json?status=any&name=${orderNumber}`;

    console.log(shopifyApiUrl)
    const orderResponse = await axios.get(shopifyApiUrl, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
        'Authorization': `Basic ${Buffer.from(`${adminApiKey}:${adminApiAccessToken}`).toString('base64')}`,

      },
    });

    if (orderResponse.data.orders.length === 0) {
      successMessage = 'Pedido no encontrado en la tienda de Shopify';
      return res.status(404).json({ error: successMessage });
    }

    const orderId = orderResponse.data.orders[0].id;
    const locationId = orderResponse.data["orders"][0]["fulfillments"][0]["location_id"];


    const updateData = {
      order: {
        id: orderId,
        fulfillment_status: 'fulfilled',
        fulfillments: [
          {
            location_id: locationId,
            tracking_company: 'GLS',
            tracking_number: trackingNumber,
            tracking_numbers: [trackingNumber],
            tracking_url: `https://gls-group.eu/EU/en/parcel-tracking?match=${trackingNumber}`,
            tracking_urls: [`https://gls-group.eu/EU/en/parcel-tracking?match=${trackingNumber}`],
            status: 'success',
            service: 'manual',
          },
        ],
      },
    };

    const updateUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders/${orderId}.json`;
    console.log(updateUrl)
    const updateResponse = await axios.put(updateUrl, updateData, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log(updateResponse)

    if (updateResponse.status !== 200) {
      console.error('Error al actualizar el pedido en la tienda de Shopify.');
      successMessage = 'Error al actualizar el pedido en la tienda de Shopify';
    }
  } catch (error) {
    console.error('Error al manejar la solicitud de la API de administración de Shopify:', error);

    let errorMessage = 'Error interno del servidor';
    if (error.response && error.response.status === 401) {
      errorMessage = 'No autorizado. Clave de API o token de acceso no válidos.';
    }

    return res.status(500).json({ error: errorMessage });
  } finally {
    if (!res.headersSent) {
      res.json({ message: successMessage });
    }
  }
}

module.exports = { handleShipmentAdminApi };
