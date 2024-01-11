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

            const orders = await shopify.order.list({ name: orderNumber, status: 'any' });

            if (!orderNumber || !trackingNumber) {
                console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
                return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
            }

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

            if (locationId) {
                console.log(`Pedido con OrderNumber ${orderNumber} ya tiene un location_id asignado. No se realizarán acciones adicionales.`);
                continue;
            }

            const fulfillmentDetails = await shopify.order.fulfillmentOrders(orderId);
            const fulfillmentOrderId = fulfillmentDetails[0].id;
            const fulfillmentLineitemIds = fulfillmentDetails[0].line_items.map(item => ({
                id: item.id,
                quantity: item.quantity
            }));

            const updateParams = {
                line_items_by_fulfillment_order: [
                    {
                        fulfillment_order_id: fulfillmentOrderId,
                        fulfillment_order_line_items: fulfillmentLineitemIds
                    }
                ],
                tracking_info: {
                    number: trackingNumber,
                    url: `https://gls-group.eu/EU/en/parcel-tracking?match=${trackingNumber}`,
                    company: 'GLS'
                },
                notify_customer: false,
                origin_address: null,
                message: 'Estado de entrega: ' + trackingNumber
            };

            // Crear la actualización de cumplimiento para el pedido
            const updateFulfillment = await shopify.fulfillment.createV2(updateParams);

            // Verificar el resultado de la actualización de cumplimiento
            if (updateFulfillment.status !== 200) {
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
