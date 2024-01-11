const Shopify = require('shopify-api-node');
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

    const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${store.toUpperCase()}`];
    const shopify = new Shopify({
      shopName: `${store}.myshopify.com`,
      apiKey: process.env.SHOPIFY_API_KEY,
      password: adminApiAccessToken,
      apiVersion: '2024-01',
    });

    for (const pedido of pedidos) {
      if (!pedido.ordernumber || !pedido.trackingnumber) {
        console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
        return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
      }

      const orderNumber = pedido.ordernumber[0];
      const trackingNumber = pedido.trackingnumber[0] + "";
      console.log('OrderNumber:', orderNumber);
      console.log('TrackingNumber:', trackingNumber);

      const orders = await shopify.order.list({ name: orderNumber, status: 'any' });

      if (orders.length === 0) {
        console.error(`Pedido no encontrado en la tienda de Shopify para OrderNumber: ${orderNumber}`);
        continue;
      }

      const currentOrder = orders.find(order => order.name === orderNumber);

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
        order_id: orderId,
        tracking_number: trackingNumber,
        line_items: fulfillmentOrderLineItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
        })),
      };

      console.log('Fulfillment Data:', JSON.stringify(fulfillmentData, null, 2));

      try {
        const createFulfillmentResponse = await shopify.fulfillment.create(fulfillmentData);

        console.log('Create Fulfillment Response:', createFulfillmentResponse);

        if (createFulfillmentResponse.status !== 201) {
          console.error(`Error al crear el cumplimiento para el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
          console.error('Detalles del error de respuesta:', createFulfillmentResponse.body);
          successMessage = 'Error al crear el cumplimiento para uno o más pedidos en la tienda de Shopify';
          continue;
        }

        console.log(`Cumplimiento creado exitosamente para el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
      } catch (createFulfillmentError) {
        console.error('Error al crear el cumplimiento:', createFulfillmentError.message);
        console.error('Detalles del error de respuesta:', createFulfillmentError.response.body);
        successMessage = 'Error al crear el cumplimiento para uno o más pedidos en la tienda de Shopify';
        continue;
      }

      // Actualizar el estado de cumplimiento del pedido y productos
      const updateData = {
        id: orderId,
        fulfillment_status: 'fulfilled',
        fulfillments: [
          {
            id: createFulfillmentResponse.body.fulfillment.id,
            tracking_number: trackingNumber,
            line_items: fulfillmentOrderLineItems.map(item => ({
              id: item.id,
              quantity: item.quantity,
            })),
          },
        ],
      };

      console.log('Update Data:', updateData);
      try {
        const updateResponse = await shopify.order.update(updateData);

        console.log('Update Response:', updateResponse);

        if (updateResponse.status !== 200) {
          console.error(`Error al actualizar el pedido en la tienda de Shopify para OrderNumber: ${orderNumber}`);
          successMessage = 'Error al actualizar uno o más pedidos en la tienda de Shopify';
        } else {
          console.log(`Pedido actualizado exitosamente en la tienda de Shopify para OrderNumber: ${orderNumber}`);
        }
      } catch (updateError) {
        console.error('Error al actualizar el pedido:', updateError.message);
        console.error('Detalles del error de respuesta:', updateError.response.body);
        successMessage = 'Error al actualizar uno o más pedidos en la tienda de Shopify';
      }
    }
  } catch (error) {
    console.error('Error al manejar la solicitud de la API de administración de Shopify:', error);

    let errorMessage = 'Error interno del servidor';

    if (error.response) {
      console.error('Detalles del error de respuesta:', error.response.body);
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
