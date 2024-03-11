const { Magento2Client } = require('magento2-rest-client');

async function handleShipmentAdminApi({ req, res, store }) {
    let successMessage = 'Solicitud de envío procesada correctamente';

    try {
        // Guardamos el XML que recibimos a través del endpoint /magento/shipments/
        const xmlData = req.body;
        const pedidos = xmlData?.pedidos?.pedido;

        if (!pedidos || !Array.isArray(pedidos)) {
            console.error('Error de validación: Pedidos no encontrados o no es una lista en los datos XML.');
            return res.status(400).json({ error: 'Pedidos no encontrados o no es una lista en los datos XML.' });
        }

        // Configuración para el acceso a la API de Magento
        const client = Magento2Client({
            url: process.env.MAGENTO_URL,
            consumerKey: process.env.MAGENTO_CONSUMER_KEY,
            consumerSecret: process.env.MAGENTO_CONSUMER_SECRET,
            accessToken: process.env.MAGENTO_ACCESS_TOKEN,
            accessTokenSecret: process.env.MAGENTO_ACCESS_TOKEN_SECRET
        });

        for (const pedido of pedidos) {
            if (!pedido.ordernumber || !pedido.trackingnumber) {
                console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
                return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
            }

            const orderNumber = pedido.ordernumber[0];
            const trackingNumber = pedido.trackingnumber[0] + "";

            // Realizar la búsqueda en Magento por el orderNumber normal y por el orderNumber con el año
            const orders = await client.orders.get(`search?searchCriteria[filterGroups][0][filters][0][field]=increment_id&searchCriteria[filterGroups][0][filters][0][value]=${orderNumber}`);

            // Buscar el pedido por el OrderNumber
            const currentOrder = orders.items.find(order => order.increment_id === orderNumber);

            // Comprobamos que el pedido exista
            if (!currentOrder) {
                console.error(`Pedido no encontrado en Magento para OrderNumber: ${orderNumber}`);
                continue;
            }

            // Verificar si el pedido tiene la dirección de envío
            if (!currentOrder.extension_attributes.shipping_assignments[0].shipping.address) {
                console.error(`Pedido encontrado en Magento para OrderNumber: ${orderNumber}, pero no tiene una dirección de envío.`);
                continue;
            }

            // Obtener la dirección de envío del pedido
            const shippingAddress = currentOrder.extension_attributes.shipping_assignments[0].shipping.address;
            const zipCode = shippingAddress.postcode;
            const countryCode = shippingAddress.country_id;

            if (countryCode != 'ES') {
                console.log(`Pedido con OrderNumber ${orderNumber} no se cerrará porque no es un pedido nacional.`);
                continue;
            }

            // Guardamos los datos
            const orderId = currentOrder.entity_id;
            const shippingCarrierCode = await obtenerCodigoTransportista(store);
            const shippingMethodCode = currentOrder.shipping_method.split('_')[0];

            // Si el pedido ya tiene un método de envío, continuamos sin hacer nada más.
            if (shippingMethodCode) {
                console.log(`Pedido con OrderNumber ${orderNumber} ya tiene un método de envío asignado. No se realizarán acciones adicionales.`);
                continue;
            }

            // Actualizamos el método de envío del pedido en Magento
            const updateOrder = await client.orders.post(`${orderId}/comments`, {
                status: 'processing',
                comment: 'Estado de envío: ' + trackingNumber
            });

            console.error('Detalles de la respuesta de Magento:', updateOrder);
        }
    } catch (error) {
        console.error('Error al manejar la solicitud de la API de Magento:', error);

        let errorMessage = 'Error interno del servidor';

        // Manejo de errores específicos según la respuesta de Magento
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

// Función para hacer una solicitud retardada con espera
async function makeDelayedRequest(requestFunc) {
    const response = await requestFunc(); // Hacer la solicitud
    await wait(500); // Esperar medio segundo
    return response; // Devolver la respuesta
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function obtenerCodigoTransportista(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT TransportCompany FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { TransportCompanyCode } = result.recordset[0];
    
        if (!TransportCompanyCode) {
            console.log(`No se ha podido obtener el código del transportista para la tienda: ${store}`);
            throw new Error('No se ha podido obtener el código del transportista');
        }
    
        return TransportCompanyCode;
    } catch (error) {
        console.error('Error al obtener el código del transportista desde la base de datos:', error);
        throw error;
    }
}

async function getAccessTokenFromDB(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT AccessToken FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { AccessToken } = result.recordset[0];
    
        if (!AccessToken) {
            console.log(`No se ha podido obtener el AccessToken para la tienda: ${store}`);
            throw new Error('No se ha podido obtener el AccessToken');
        }
    
        return AccessToken;
    } catch (error) {
        console.error('Error al obtener el AccessToken desde la base de datos:', error);
        throw error;
    }
}

async function getConsumerKeyFromDB(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT ConsumerKey FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { ConsumerKey } = result.recordset[0];
    
        if (!ConsumerKey) {
            console.log(`No se ha podido obtener la ConsumerKey para la tienda: ${store}`);
            throw new Error('No se ha podido obtener la ConsumerKey');
        }
    
        return ConsumerKey;
    } catch (error) {
        console.error('Error al obtener la ConsumerKey desde la base de datos:', error);
        throw error;
    }
}

async function getUrlWebServiceFromDB(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT UrlTienda FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { UrlWebService } = result.recordset[0];
    
        if (!UrlWebService) {
            console.log(`No se ha podido obtener la URL del servicio web para la tienda: ${store}`);
            throw new Error('No se ha podido obtener la URL del servicio web');
        }
    
        return UrlWebService;
    } catch (error) {
        console.error('Error al obtener la URL del servicio web desde la base de datos:', error);
        throw error;
    }
}

async function getAccessTokenSecretFromDB(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT AccessTokenSecret FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { UrlWebService } = result.recordset[0];
    
        if (!UrlWebService) {
            console.log(`No se ha podido obtener la AccessTokenSecret del servicio web para la tienda: ${store}`);
            throw new Error('No se ha podido obtener la AccessTokenSecret del servicio web');
        }
    
        return UrlWebService;
    } catch (error) {
        console.error('Error al obtener la AccessTokenSecret del servicio web desde la base de datos:', error);
        throw error;
    }
}

async function getConsumerSecretFromDB(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT ConsumerSecret FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
        
        const { UrlWebService } = result.recordset[0];
    
        if (!UrlWebService) {
            console.log(`No se ha podido obtener la ConsumerSecret para la tienda: ${store}`);
            throw new Error('No se ha podido obtener la ConsumerSecret');
        }
    
        return UrlWebService;
    } catch (error) {
        console.error('Error al obtener la ConsumerSecret desde la base de datos:', error);
        throw error;
    }
}

module.exports = { handleShipmentAdminApi };
