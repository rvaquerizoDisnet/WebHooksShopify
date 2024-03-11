const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
require('dotenv').config();
const { pool, sql, connectToDatabase2 } = require('../utils/database2');

async function handleShipmentAdminApi({ req, res, store }) {
    let successMessage = 'Solicitud de envío procesada correctamente';

    try {
        const xmlData = req.body;
        const pedidos = xmlData?.pedidos?.pedido;

        if (!pedidos || !Array.isArray(pedidos)) {
            console.error('Error de validación: Pedidos no encontrados o no es una lista en los datos XML.');
            return res.status(400).json({ error: 'Pedidos no encontrados o no es una lista en los datos XML.' });
        }

        // Configuración para el acceso a la API
        const apiSecret = await obtenerApiSecretTienda(store);
        const apiKey = await obtenerApiKeyTienda(store);
        
        const WooCommerce = new WooCommerceRestApi({
            url: 'http://example.com', // Tu URL de la tienda
            consumerKey: apiKey, // Tu clave de consumidor
            consumerSecret: apiSecret, // Tu secreto de consumidor
            version: 'wc/v3' // Versión de la API de WooCommerce
        });

        for (const pedido of pedidos) {
            if (!pedido.ordernumber || !pedido.trackingnumber) {
                console.error('Error de validación: OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.');
                return res.status(400).json({ error: 'OrderNumber y TrackingNumber son necesarios en los datos XML del pedido.' });
            }
        
            const orderNumber = pedido.ordernumber[0];
            const trackingNumber = pedido.trackingnumber[0] + "";

            // Obtenemos la información de la compañía de transporte
            const company = await obtenerNombreCompania(store);

            // Construimos la URL de seguimiento según la compañía
            let url = '';
            if (company === 'GLS') {
                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
            } else if (company === 'Correos') {
                url = `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${trackingNumber}`;
            } else {
                url = `https://mygls.gls-spain.es/e/${trackingNumber}/${zipCode}/en`;
            }

            // Actualizamos el pedido con la información de seguimiento
            const updateParams = {
                tracking_number: trackingNumber,
                tracking_url: url,
                status: 'completed'
            };

            // Realizamos la solicitud para actualizar el pedido
            await WooCommerce.put(`orders/${orderNumber}`, updateParams);
        }
    } catch (error) {
        console.error('Error al manejar la solicitud de la API de administración de WooCommerce:', error);

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
        const pool = await connectToDatabase2();
        const request = pool.request();
    
        const result = await request.input('NombreEndpoint', sql.NVarChar, store)
            .query('SELECT TransportCompany FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
        
        const { TransportCompany } = result.recordset[0];
    
    
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
async function obtenerApiKeyTienda(store) {
    try {
      const pool = await connectToDatabase2();
      const request = pool.request();
  
      // Hacer una consulta a la base de datos para obtener el Secrets de la tienda
      const result = await request.input('NombreEndpoint', sql.NVarChar, store)
        .query('SELECT ApiKey FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
      

      const ApiKey = result.recordset[0]?.ApiKey;
  
  
      if (!ApiKey) {
        console.log('No se ha podido obtener el ApiKey para la tienda:', store);
        throw new Error('No se ha podido obtener el Secrets');
      }
  
      return ApiKey;
    } catch (error) {
      console.error('Error al obtener los Secrets desde la base de datos:', error);
      throw error;
    }
  }

  async function obtenerApiSecretTienda(store) {
    try {
      const pool = await connectToDatabase2();
      const request = pool.request();
  
      // Hacer una consulta a la base de datos para obtener el Secrets de la tienda
      const result = await request.input('NombreEndpoint', sql.NVarChar, store)
        .query('SELECT ApiSecret FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
      
      const ApiSecret = result.recordset[0]?.ApiSecret;
  
  
      if (!ApiSecret || !ApiKey) {
        console.log('No se ha podido obtener el ApiKey o el ApiSecret para la tienda:', store);
        throw new Error('No se ha podido obtener el Secrets');
      }
  
      return ApiSecret;
    } catch (error) {
      console.error('Error al obtener los Secrets desde la base de datos:', error);
      throw error;
    }
  }



module.exports = { handleShipmentAdminApi };