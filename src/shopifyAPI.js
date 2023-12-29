// Importación de módulos necesarios
const xml2js = require('xml2js');
const axios = require('axios');
require('dotenv').config();

// Función asincrónica para manejar la API de administración de envíos en Shopify
async function handleShipmentAdminApi({ req, res, store }) {
  // Mensaje de éxito predeterminado
  let successMessage = 'Solicitud de envío procesada correctamente';

  try {
    // Se obtiene el cuerpo XML de la solicitud
    const xmlData = req.body;
    console.log('XML Data:', xmlData);

    // Se extraen datos importantes del XML
    const pedido = xmlData?.pedidos?.pedido?.[0];
    if (!pedido || !pedido.ordernumber || !pedido.trackingnumber) {
      // Validación de datos: OrderNumber y TrackingNumber son necesarios en los datos XML
      console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML.');
      return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML.' });
    }

    const orderNumber = pedido.ordernumber[0];
    const trackingNumber = pedido.trackingnumber[0];
    console.log('OrderNumber:', orderNumber);
    console.log('TrackingNumber:', trackingNumber);

    // Se obtienen claves de API y token de acceso desde variables de entorno
    const adminApiKey = process.env[`SHOPIFY_API_KEY_${store.toUpperCase()}`];
    const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${store.toUpperCase()}`];

    // Validación de claves de API y token de acceso
    if (!adminApiKey || !adminApiAccessToken) {
      console.error('Error de configuración: API key o token de acceso no configurados correctamente.');
      return res.status(500).json({ error: 'API key o token de acceso no configurados correctamente.' });
    }

    // Construcción de la URL de la API de Shopify para obtener información del pedido
    const shopifyApiUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders.json?status=any&name=${orderNumber}`;
    console.log('Shopify API URL:', shopifyApiUrl);

    // Consulta a la API de Shopify para obtener información del pedido
    const orderResponse = await axios.get(shopifyApiUrl, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
        'Authorization': `Basic ${Buffer.from(`${adminApiKey}:${adminApiAccessToken}`).toString('base64')}`,
      },
    });

    // Procesamiento de la respuesta de la API de Shopify
    console.log('Shopify API Response:', orderResponse.data);

    if (orderResponse.data.orders.length === 0) {
      successMessage = 'Pedido no encontrado en la tienda de Shopify';
      console.error(successMessage);
      return res.status(404).json({ error: successMessage });
    }

    const orderId = orderResponse.data.orders[0].id;
    const locationId = orderResponse.data.orders[0].fulfillments[0]?.location_id;

    console.log('Order ID:', orderId);
    console.log('Location ID:', locationId);

    // Preparación de datos para actualizar el pedido en Shopify
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
        note_attributes: [
          {
            name: 'Estado de entrega:',
            value: trackingNumber,
          },
        ],
      },
    };

    // Construcción de la URL de la API de Shopify para actualizar el pedido
    const updateUrl = `https://${store}.myshopify.com/admin/api/2023-10/orders/${orderId}.json`;
    console.log('Update URL:', updateUrl);

    // Consulta a la API de Shopify para actualizar el pedido
    const updateResponse = await axios.put(updateUrl, updateData, {
      headers: {
        'X-Shopify-Access-Token': adminApiAccessToken,
        'Content-Type': 'application/json',
      },
    });

    // Procesamiento de la respuesta de la actualización de la API de Shopify
    console.log('Update Response:', updateResponse.data);

    // Manejo de errores en la actualización del pedido
    if (updateResponse.status !== 200) {
      console.error('Error al actualizar el pedido en la tienda de Shopify.');
      successMessage = 'Error al actualizar el pedido en la tienda de Shopify';
    } else {
      console.log('Pedido actualizado exitosamente en la tienda de Shopify.');
      // Puedes agregar mensajes adicionales o lógica aquí según sea necesario
    }
  } catch (error) {
    // Manejo de errores generales
    console.error('Error al manejar la solicitud de la API de administración de Shopify:', error);

    // Mensaje de error predeterminado
    let errorMessage = 'Error interno del servidor';

    // Personalización del mensaje de error en caso de error de autenticación
    if (error.response && error.response.status === 401) {
      errorMessage = 'No autorizado. Clave de API o token de acceso no válidos.';
    }

    // Respuesta de error al cliente
    return res.status(500).json({ error: errorMessage });
  } finally {
    // Enviar respuesta al cliente si aún no se ha enviado
    if (!res.headersSent) {
      console.log('Final Response:', { message: successMessage });
      res.json({ message: successMessage });
    }
  }
}

// Exportación de la función para su uso en otros archivos
module.exports = { handleShipmentAdminApi };
