// shopifyAPI.js
const axios = require('axios');
const sql = require('mssql');
require('dotenv').config();

// shopifyAPI.js
async function handleShipment({ req, res, store }) {
  try {
    // Asegúrate de que req.body contenga la información necesaria, como orderId y sesionCliente
    const { orderId, sesionCliente } = req.body;

    // Consulta a la BBDD del SGA para obtener el número de seguimiento
    const trackingNumber = await consultarTrackingNumber(orderId, sesionCliente);

    // Realizar la llamada a la API de Shopify para actualizar el estado de cumplimiento y agregar el número de seguimiento
    const shopifyEndpoint = `https://${store}.myshopify.com/admin/api/2023-01/orders/${orderId}/fulfillments.json`;
    // Obtener la clave de la API de Shopify según la tienda
    const shopifyApiKey = getShopifyApiKey(store);

    const response = await axios.post(
      shopifyEndpoint,
      {
        fulfillment: {
          tracking_number: trackingNumber,
          status: 'fulfilled',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyApiKey,
        },
      }
    );

    console.log('Shopify API response:', response.data);
  } catch (error) {
    console.error('Error handling shipment:', error);
  }
}


function getShopifyApiKey(store) {
  switch (store) {
    case 'printalot':
      return process.env.SHOPIFY_API_KEY_PRINTALOT;
    // Agrega más casos según sea necesario
    default:
      throw new Error(`Clave de API de Shopify no encontrada para la tienda: ${store}`);
  }
}


async function consultarTrackingNumber(orderId, sesionCliente) {
  try {
    // Configuración de las credenciales desde el archivo .env
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      options: {
        encrypt: true, // Necesario si estás accediendo a una base de datos de Azure
      },
    };

    // Crear una pool de conexión
    const pool = await new sql.ConnectionPool(config).connect();

    // Consultar el número de seguimiento desde la base de datos
    // Esta consulta no es correcta solo la hago de prueba
    const result = await pool.request().query(`SELECT TrackingNumber FROM TuTabla WHERE OrderId = ${orderId} AND SesionCliente = ${sesionCliente}`);

    // Cerrar la pool de conexión
    await pool.close();

    // Devolver el número de seguimiento (ajusta esto según la estructura real de la base de datos)
    return result.recordset[0].TrackingNumber;
  } catch (error) {
    console.error('Error en la consulta de número de seguimiento:', error);
    throw error;
  }
}



module.exports = { handleShipment, getShopifyApiKey  };



// Lo que hara este codigo es que cuando se dispare la tarea automatica en el SGA de que el albaran se ha creado
// es que hara una consulta a la bbdd para obtener el tracking number, cuando haya obtenido eso podra hacer post a la 
// shopify api para modificar el fulfillment status y el delivery status (añadir tracking number). Si la tarea automatica es un post, 
// hare un endpoint nuevo para que cada vez que haya un post lo ejecute, en este post tiene que haber el orderId para poder saber que 
// order modificar y que tracking number coger.

// Si no se puede configurar el webservice para que nos haga post la otra opcion seria hacer post
// Nosotros y que su respuesta sea lo que queriamos, pero el problema es que no se si se guardaran los albaranes ya hechos para poder consultarlos
// Porque como se que pedidos son de shopify, y que pedidos son los que han cambiado de estado hace menos de las 2 horas del bucle
// Que creare para hacer la peticion
// Ver shopifyAPISinosePuedeHacerPost.txt

// hay que hacer consulta a la bbdd para seleccionar el tracking number del order de todos los IDs que en shopify aparecen como unfulfilled