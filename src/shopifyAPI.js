// shopifyAPI.js
const xml2js = require('xml2js');
const axios = require('axios');
require('dotenv').config();

async function handleShipmentAdminApi({ req, res, store }) {
  let successMessage = 'Shipment request processed successfully';

  try {
    const parsedData = req.body;

    const orderNumber = parsedData.pedido.ordernumber[0];
    const trackingNumber = parsedData.pedido.trackingnumber[0];

    if (!orderNumber || !trackingNumber) {
      return res.status(400).json({ error: 'OrderNumber and TrackingNumber are required in the XML data.' });
    }

    const adminApiAccessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN_PRINTALOT;

    if (!adminApiAccessToken) {
      return res.status(500).json({ error: 'Shopify Admin API access token not found for the specified store.' });
    }

    const shopifyApiUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders.json?status=any&name=${orderNumber}`;

    const orderResponse = await axios.get(shopifyApiUrl, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
      },
    });

    if (orderResponse.data.orders.length === 0) {
      successMessage = 'Order not found in the Shopify store';
      return res.status(404).json({ error: successMessage });
    }

    const orderId = orderResponse.data.orders[0].id;

    const updateData = {
      order: {
        id: orderId,
        fulfillment_status: 'fulfilled',
        note_attributes: [
          {
            name: 'Delivery Status',
            value: trackingNumber,
          },
        ],
      },
    };

    const updateUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders/${orderId}.json`;

    const updateResponse = await axios.put(updateUrl, updateData, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (updateResponse.status !== 200) {
      console.error('Failed to update order in the Shopify store.');
      successMessage = 'Failed to update order in the Shopify store';
    }

  } catch (error) {
    console.error('Error handling Shopify Admin API request:', error.response.data);
  
    let errorMessage = 'Internal Server Error';
    if (error.response && error.response.status === 401) {
      errorMessage = 'Unauthorized. Invalid API key or access token.';
    }
  
    return res.status(500).json({ error: errorMessage });
  } finally {
    res.json({ message: successMessage });
  }
}

module.exports = { handleShipmentAdminApi };
