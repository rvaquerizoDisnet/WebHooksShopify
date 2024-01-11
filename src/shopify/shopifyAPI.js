const axios = require('axios');
require('dotenv').config();

async function handleShipmentAdminApi({ req, res, store }) {
  let successMessage = 'Solicitud de envío procesada correctamente';

  try {
    const xmlData = req.body;
    const pedidos = xmlData?.pedidos?.pedido;

    if (!pedidos || !Array.isArray(pedidos)) {
      console.error('Error de validación: Pedidos no encontrados o no es una lista en los datos XML.');
      return res.status(400).json({ error: 'Pedidos no encontrados o no es una lista en los datos XML.' });
    }

    for (const pedido of pedidos) {
      if (!pedido.ordernumber || !pedido.trackingnumber) {
        console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
        return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
      }

      const orderNumber = pedido.ordernumber[0];
      const trackingNumber = pedido.trackingnumber[0] + "";
      console.log('OrderNumber:', orderNumber);
      console.log('TrackingNumber:', trackingNumber);

      const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${store.toUpperCase()}`];

      const shopifyApiUrl = `https://${store}.myshopify.com/admin/api/2024-01/orders.json?status=any&name=${orderNumber}`;

      const orderResponse = await axios.get(shopifyApiUrl, {
        headers: {
          'X-Shopify-Access-Token': adminApiAccessToken,
        },
      });

      if (orderResponse.data.orders.length === 0) {
        console.error(`Pedido no encontrado en la tienda de Shopify para OrderNumber: ${orderNumber}`);
        continue;
      }

      const currentOrder = orderResponse.data.orders.find(order => order.name === orderNumber);

      if (!currentOrder) {
        console.error(`Pedido no encontrado en la tienda de Shopify para OrderNumber: ${orderNumber}`);
        continue;
      }

      const orderId = currentOrder.id;
      const locationId = currentOrder.fulfillments[0]?.location_id;

      console.log('Order ID:', orderId);
      console.log('Location ID:', locationId);

      if (locationId) {
        console.log(`Pedido con OrderNumber ${orderNumber} ya tiene un location_id asignado. No se realizarán acciones adicionales.`);
        continue;
      }

      const fulfillmentOrderLineItems = currentOrder.line_items.map(lineItem => ({
        id: lineItem.id,
        quantity: lineItem.quantity,
      }));

      const fulfillmentData = {
        fulfillment: {
          notify_customer: true,
          location_id: 92700442965,
          tracking_info: {
            number: trackingNumber,
            url: `https://gls-group.eu/EU/en/parcel-tracking?match=${trackingNumber}`,
            company: "GLS"
          },
          line_items_by_fulfillment_order: fulfillmentOrderLineItems.map(item => ({
            fulfillment_order_id: item.id,
            fulfillment_order_line_items: item.quantity,
          })),
        },
      };

      console.log('Fulfillment Data:', JSON.stringify(fulfillmentData, null, 2));

      try {
        const createFulfillmentResponse = await axios.post(
          `https://${store}.myshopify.com/admin/api/2024-01/orders/${orderId}/fulfillments.json`,
          fulfillmentData,
          {
            headers: {
              'X-Shopify-Access-Token': adminApiAccessToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        );


        console.log('Respuesta de la consulta del pedido:', orderResponse.data);
        console.log('Create Fulfillment Response:', createFulfillmentResponse.data);

        if (createFulfillmentResponse.status !== 201) {
          console.error(`Error al crear el cumplimiento para el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
          console.error('Detalles del error de respuesta:', createFulfillmentResponse.data);
          successMessage = 'Error al crear el cumplimiento para uno o más pedidos en la tienda de Shopify';
          continue;
        }

        console.log(`Cumplimiento creado exitosamente para el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
      } catch (createFulfillmentError) {
        console.error('Error al crear el cumplimiento:', createFulfillmentError.message);
        console.error('Detalles del error de respuesta:', createFulfillmentError.response.data);
        successMessage = 'Error al crear el cumplimiento para uno o más pedidos en la tienda de Shopify';
        continue;
      }

      // Actualizar el estado de cumplimiento del pedido y productos
      const updateData = {
        order: {
          id: orderId,
          fulfillment_status: 'fulfilled',
        },
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
            line_items: fulfillmentOrderLineItems,
          },
        ],
        note_attributes: [
          {
            name: 'Estado de entrega:',
            value: trackingNumber,
          },
        ],
      };

      const updateUrl = `https://${store}.myshopify.com/admin/api/2024-01/orders/${orderId}.json`;
      console.log('Update URL:', updateUrl);

      console.log('Update Data:', updateData);
      const updateResponse = await axios.put(updateUrl, updateData, {
        headers: {
          'X-Shopify-Access-Token': adminApiAccessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Update Response:', updateResponse.data);

      if (updateResponse.status !== 200) {
        console.error(`Error al actualizar el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
        successMessage = 'Error al actualizar uno o más pedidos en la tienda de Shopify';
      } else {
        console.log(`Pedido actualizado exitosamente en la tienda de Shopify para OrderNumber: ${orderNumber}`);
      }
    }
  } catch (error) {
    console.error('Error al manejar la solicitud de la API de administración de Shopify:', error);

    let errorMessage = 'Error interno del servidor';

    if (error.response) {
      console.error('Detalles del error de respuesta:', error.response.data);
    }

    if (error.response && error.response.status === 401) {
      errorMessage = 'No autorizado. Clave de API o token de acceso no válidos.';
    }

    return res.status(500).json({ error: errorMessage });
  } finally {
    if (!res.headersSent) {
      console.log('Final Response:', { message: successMessage });
      res.json({ message: successMessage });
    }
  }
}

module.exports = { handleShipmentAdminApi };
