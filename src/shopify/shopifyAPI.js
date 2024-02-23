const Shopify = require('shopify-api-node');
require('dotenv').config();
const db = require('../utils/database');
const mssql = require('mssql');


async function handleShipmentAdminApi({ req, res, store }) {
    let successMessage = 'Solicitud de envío procesada correctamente';

    try {
        // Guardamos el XML que recibimos atraves del endpoint /shopify/shipments/
        const xmlData = req.body;
        const pedidos = xmlData?.pedidos?.pedido;

        if (!pedidos || !Array.isArray(pedidos)) {
            console.error('Error de validación: Pedidos no encontrados o no es una lista en los datos XML.');
            return res.status(400).json({ error: 'Pedidos no encontrados o no es una lista en los datos XML.' });
        }

        // Configuración para el acceso a la API
        const adminApiAccessToken = await getAdminApiAccessTokenFromDB(store);
        console.log("adminApiAccessToken ", adminApiAccessToken)
        const apiKey = await getApiKeyFromDB(store);
        console.log("apiKey ", apiKey)

        console.log(store)

        const shopify = new Shopify({
            shopName: `${store}.myshopify.com`,
            apiKey: apiKey,
            password: adminApiAccessToken,
            apiVersion: '2024-01',
        });

        for (const pedido of pedidos) {
            if (!pedido.ordernumber || !pedido.trackingnumber) {
                console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
                return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
            }
        
            const orderNumber = pedido.ordernumber[0];
            console.log(orderNumber+ " OrderNumber")
            const trackingNumber = pedido.trackingnumber[0] + "";
            console.log(trackingNumber+ " trackingNumber")
        
            let yearOrderNumber = orderNumber;
    
            const currentYear = new Date().getFullYear();
            yearOrderNumber = `#${currentYear}${orderNumber.slice(1)}`;
        
            // Realizar la búsqueda en Shopify por el orderNumber normal y por el orderNumber con el año
            const ordersByOrderNumber = await shopify.order.list({ name: orderNumber, status: 'any' });
            //console.log("ordersByOrderNumber ", ordersByOrderNumber)
            const ordersByYearAndOrderNumber = await shopify.order.list({ name: yearOrderNumber, status: 'any' });
            //console.log("ordersByYearAndOrderNumber ", ordersByYearAndOrderNumber)
            // Concatenar los resultados de ambas búsquedas
            const orders = ordersByOrderNumber.concat(ordersByYearAndOrderNumber);
            //console.log("orders ", orders)


            // Buscar el pedido por el OrderNumber
            const currentOrder = orders.find(order => order.name === orderNumber || order.name === yearOrderNumber);
            console.log(currentOrder + "currentOrder")
            
            // Comprobamos que el pedido exista
            if (!currentOrder) {
                console.error(`Pedido no encontrado en la tienda de Shopify para OrderNumber: ${orderNumber} o ${yearOrderNumber}`);
                continue;
            }

            // Verificar si el pedido tiene la dirección de envío
            if (!currentOrder.shipping_address) {
                console.error(`Pedido encontrado en la tienda de Shopify para OrderNumber: ${orderNumber} o ${yearOrderNumber}, pero no tiene una dirección de envío.`);
                continue;
            }

            // Obtener la dirección de envío del pedido
            const shippingAddress = currentOrder.shipping_address;
            const zipCode = shippingAddress.zip;
            const countryCode = shippingAddress.country_code;

            if (countryCode != 'ES') {
                console.log(`Pedido con OrderNumber ${orderNumber} o ${yearOrderNumber} no se cerrara porque no es un pedido nacional.`);
                continue;
            }

            // Guardamos los datos
            const orderId = currentOrder.id;
            console.log("OrderId: ", orderId)
            const locationId = currentOrder.fulfillments[0]?.location_id;
            console.log("locationId: ", locationId)

            // Si el pedido ya tiene una locationID es decir ya tiene el fulfillment creado, continuamos sin hacer nada mas.
            if (locationId) {
                console.log(`Pedido con OrderNumber ${orderNumber} o ${yearOrderNumber} ya tiene un location_id asignado. No se realizarán acciones adicionales.`);
                continue;
            }

            // Obtenenmos el fulfillment del idOrder que hemos obtenido antes
            const fulfillmentDetails = await shopify.order.fulfillmentOrders(orderId);
            const fulfillmentOrderId = fulfillmentDetails[0].id;
            const fulfillmentLineitemIds = fulfillmentDetails[0].line_items.map(item => ({
                id: item.id,
                quantity: item.quantity
            }));

            const company = obtenerNombreCompania(store);
            let url = ''
            if (company === 'GLS') {
                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
            } else if (company === 'Correos') {
                url = `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${trackingNumber}`;
            } else {
                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
            }

            // Payload para updatear el pedido
            const updateParams = {
                line_items_by_fulfillment_order: [
                    {
                        fulfillment_order_id: fulfillmentOrderId,
                        fulfillment_order_line_items: fulfillmentLineitemIds
                    }
                ],
                tracking_info: {
                    number: trackingNumber,
                    url: url,
                    company: company
                },const Shopify = require('shopify-api-node');
                require('dotenv').config();
                
                async function handleShipmentAdminApi({ req, res, store }) {
                    let successMessage = 'Solicitud de envío procesada correctamente';
                
                    try {
                        // Guardamos el XML que recibimos atraves del endpoint /shopify/shipments/
                        const xmlData = req.body;
                        const pedidos = xmlData?.pedidos?.pedido;
                
                        if (!pedidos || !Array.isArray(pedidos)) {
                            console.error('Error de validación: Pedidos no encontrados o no es una lista en los datos XML.');
                            return res.status(400).json({ error: 'Pedidos no encontrados o no es una lista en los datos XML.' });
                        }
                
                        // Configuracion para el acceso a la API
                        const formattedStore = store.toUpperCase().replace(/-/g, '_');
                        const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${formattedStore}`];
                        const apiKey = process.env[`SHOPIFY_API_KEY_${formattedStore}`];
                        const shopify = new Shopify({
                            shopName: `${store}.myshopify.com`,
                            apiKey: apiKey,
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
                        
                        
                            let yearOrderNumber = orderNumber;
                    
                            const currentYear = new Date().getFullYear();
                            yearOrderNumber = `#${currentYear}${orderNumber.slice(1)}`;
                            
                        
                            // Realizar la búsqueda en Shopify por el orderNumber normal y por el orderNumber con el año
                            const ordersByOrderNumber = await shopify.order.list({ name: orderNumber, status: 'any' });
                            //console.log("ordersByOrderNumber ", ordersByOrderNumber)
                            const ordersByYearAndOrderNumber = await shopify.order.list({ name: yearOrderNumber, status: 'any' });
                            //console.log("ordersByYearAndOrderNumber ", ordersByYearAndOrderNumber)
                            // Concatenar los resultados de ambas búsquedas
                            const orders = ordersByOrderNumber.concat(ordersByYearAndOrderNumber);
                            //console.log("orders ", orders)
                
                
                            // Buscar el pedido por el OrderNumber
                            const currentOrder = orders.find(order => order.name === orderNumber || order.name === yearOrderNumber);
                
                            
                            // Comprobamos que el pedido exista
                            if (!currentOrder) {
                                console.error(`Pedido no encontrado en la tienda de Shopify para OrderNumber: ${orderNumber} o ${yearOrderNumber}`);
                                continue;
                            }
                
                            // Verificar si el pedido tiene la dirección de envío
                            if (!currentOrder.shipping_address) {
                                console.error(`Pedido encontrado en la tienda de Shopify para OrderNumber: ${orderNumber} o ${yearOrderNumber}, pero no tiene una dirección de envío.`);
                                continue;
                            }
                
                            // Obtener la dirección de envío del pedido
                            const shippingAddress = currentOrder.shipping_address;
                            const zipCode = shippingAddress.zip;
                            const countryCode = shippingAddress.country_code;
                
                            if (countryCode != 'ES') {
                                console.log(`Pedido con OrderNumber ${orderNumber} o ${yearOrderNumber} no se cerrara porque no es un pedido nacional.`);
                                continue;
                            }
                
                            // Guardamos los datos
                            const orderId = currentOrder.id;
                            const locationId = currentOrder.fulfillments[0]?.location_id;
                
                            // Si el pedido ya tiene una locationID es decir ya tiene el fulfillment creado, continuamos sin hacer nada mas.
                            if (locationId) {
                                console.log(`Pedido con OrderNumber ${orderNumber} o ${yearOrderNumber} ya tiene un location_id asignado. No se realizarán acciones adicionales.`);
                                continue;
                            }
                
                            // Obtenenmos el fulfillment del idOrder que hemos obtenido antes
                            const fulfillmentDetails = await shopify.order.fulfillmentOrders(orderId);
                            const fulfillmentOrderId = fulfillmentDetails[0].id;
                            const fulfillmentLineitemIds = fulfillmentDetails[0].line_items.map(item => ({
                                id: item.id,
                                quantity: item.quantity
                            }));
                
                            const company = obtenerNombreCompania(store);
                            let url = ''
                            if (company === 'GLS') {
                                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
                            } else if (company === 'Correos') {
                                url = `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${trackingNumber}`;
                            } else {
                                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
                            }
                
                            // Payload para updatear el pedido
                            const updateParams = {
                                line_items_by_fulfillment_order: [
                                    {
                                        fulfillment_order_id: fulfillmentOrderId,
                                        fulfillment_order_line_items: fulfillmentLineitemIds
                                    }
                                ],
                                tracking_info: {
                                    number: trackingNumber,
                                    url: url,
                                    company: company
                                },
                                notify_customer: true,
                                origin_address: null,
                                message: 'Estado de entrega: ' + trackingNumber
                            };
                
                            // Crear la actualización de cumplimiento para el pedido
                            const updateFulfillment = await shopify.fulfillment.createV2(updateParams);
                
                            console.error('Detalles de la respuesta de Shopify:', updateFulfillment);
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
                
                function obtenerNombreCompania(store) {
                    switch (store) {
                        case 'printalot-es':
                            return 'GLS';
                        case 'ami-iyok':
                            return 'GLS';
                        default:
                            return 'gls';
                    }
                }
                
                module.exports = { handleShipmentAdminApi };
                
                notify_customer: true,
                origin_address: null,
                message: 'Estado de entrega: ' + trackingNumber
            };

            // Crear la actualización de cumplimiento para el pedido
            const updateFulfillment = await shopify.fulfillment.createV2(updateParams);

            console.error('Detalles de la respuesta de Shopify:', updateFulfillment);
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

async function obtenerNombreCompania(store) {
    try {
        const pool = await db.connectToDatabase();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
            .query('SELECT TransportCompany FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
        
        const { TransportCompany } = result.recordset[0];
    
        //await db.closeDatabaseConnection(pool);
    
        if (!TransportCompany) {
            console.log(`No se ha podido obtener la compañía de transporte para la tienda: ${store}`);
            throw new Error('No se ha podido obtener la compañía de transporte');
        }
    
        return TransportCompany;
    } catch (error) {
        console.error('Error al obtener la compañía de transporte desde la base de datos:', error);
        throw error;
    }
}

async function getAdminApiAccessTokenFromDB(store) {
    try {
      const pool = await db.connectToDatabase();
      const request = pool.request();
  
      const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
        .query('SELECT AccessToken FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
      
      const { AccessToken } = result.recordset[0];
  
      //await db.closeDatabaseConnection(pool);
  
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


  async function getApiKeyFromDB(store) {
    try {
      const pool = await db.connectToDatabase();
      const request = pool.request();
  
      const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
        .query('SELECT ApiKey FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
      
      const { ApiKey } = result.recordset[0];
  
      //await db.closeDatabaseConnection(pool);
  
      if (!ApiKey) {
        console.log(`No se ha podido obtener la API Key para la tienda: ${store}`);
        throw new Error('No se ha podido obtener la API Key');
      }
  
      return ApiKey;
    } catch (error) {
      console.error('Error al obtener la API Key desde la base de datos:', error);
      throw error;
    }
  }
  



module.exports = { handleShipmentAdminApi };