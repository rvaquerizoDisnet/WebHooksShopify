const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const nodemailer = require('nodemailer');
const winston = require('winston');
const path = require('path');

require('dotenv').config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../..', 'log', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../..', 'log', 'combined.log') }),
  ],
});

const queue = [];
const maxRetries = 10;
const retryInterval = 10 * 60 * 1000;

async function handleRetry(job, retryCount) {
  try {
    if (retryCount < maxRetries) {
      logger.info(`Reintentando trabajo después de ${retryInterval / 1000} segundos. Intento ${retryCount + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      await handleWebhook(job, retryCount + 1);
    } else {
      await sendErrorEmail(job, retryCount);
      logger.error(`El trabajo ha fallado después de ${maxRetries} intentos. Tipo: ${job.tipo}. Detalles: ${JSON.stringify(job)}`);
      console.error(`El trabajo ha fallado después de ${maxRetries} intentos. Tipo: ${job.tipo}`);
    }
  } catch (error) {
    logger.error(`Error en handleRetry para el trabajo tipo ${job.tipo}:`, error);
  }
}

async function sendErrorEmail(job, retryCount) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'outlook',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: [process.env.INFO_EMAIL, process.env.EMAIL_1, process.env.EMAIL_2],
      subject: `Error en el trabajo tipo ${job.tipo}`,
      text: `El trabajo ha fallado después de ${retryCount} intentos. Detalles: ${JSON.stringify(job)}`,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo electrónico enviado:', info.response);
  } catch (error) {
    logger.error('Error en sendErrorEmail:', error);
  }
}

async function processQueue() {
  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await handleWebhook(job);
    } catch (error) {
      logger.error('Error al procesar el trabajo:', error);
      await handleRetry(job, 0);
    }
  }
}

function addToQueue(jobData) {
  queue.push(jobData);
  processQueue();
}

// Añadir aqui el nombre de la tienda y su ruta asignada en la api
function initWebhooks(app, providedUrl) {
  const stores = [
    { name: 'printalot-es', route: '/shopify-webhook/printalot/orders' },
    // Agrega más tiendas según tus necesidades
  ];

  stores.forEach(store => {
    const rutaWebhook = `${providedUrl}:3000${store.route}`;

    app.post(rutaWebhook, async (req, res) => {
      try {
        const jobData = { tipo: 'orders', req, res, store: store.name };
        await handleWebhook(jobData);
        res.status(200).send('OK');
      } catch (error) {
        logger.error('Error al procesar el webhook:', error);
        res.status(500).send('Internal Server Error');
      }
    });
  });

  setInterval(processQueue, 1000);
}

async function handleWebhook({ tipo, req, res, store }, retryCount = 0) {
  try {
    if (tipo === 'orders') {
      if (!res.headersSent) {
        res.status(200).send('OK');
      }
      await handleOrderWebhook(req.body, store);
    } else if (tipo === 'shipments') {
      // Lógica para el nuevo evento de albaranes
      // await shopifyAPI.handleShipment(req.body);
    } else {
      console.error(`Tipo de webhook no reconocido: ${tipo}`);
    }
  } catch (error) {
    logger.error(`Error en handleWebhook para el trabajo tipo ${tipo}. Detalles: ${JSON.stringify({ tipo, retryCount, error })}`);
    await handleRetry({ tipo, req, res, store }, retryCount);
  }
}

async function handleOrderWebhook(jsonData, store) {
  try {
    const xmlData = convertirJSToXML(mapJsonToXml(jsonData, store));
    const response = await enviarDatosAlWebService(xmlData, 'orders');

    console.log(`Respuesta del servicio web para orders:`, response.data);
  } catch (error) {
    logger.error('Error al procesar el webhook de orders:', error);
    throw error;
  }
}

async function enviarDatosAlWebService(xmlData, tipo) {
  const urlWebService = 'http://webservice.disnet.es:30000/00GENShopify';
  try {
    const response = await axios.post(urlWebService, xmlData, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
    return response;
  } catch (error) {
    logger.error('Error al enviar datos al servicio web:', error);
    throw error;
  }
}

function convertirJSToXML(data) {
  try {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(data);
    console.log('XML convertido:', xml);
    return xml;
  } catch (error) {
    logger.error('Error al convertir JS a XML:', error);
    throw error;
  }
}

// Mapea los datos JSON a XML
function mapJsonToXml(jsonData, store) {
  const destinatario = jsonData.shipping_address || {};

  // Obtener notas del cliente desde note_attributes y combinarlas en una cadena separada por comas
  let notasCliente = jsonData.note_attributes ? jsonData.note_attributes.map(attr => attr.value).join(', ') : 'Sin observaciones';

  // Add the following lines to handle the case when notasCliente is an empty string
  if (!notasCliente.trim()) {
    notasCliente = 'Sin observaciones';
  }


  // Obtener lineas
  const lineas = jsonData.line_items
    ? jsonData.line_items.map((item, index) => ({
        CodArticulo: item.sku || `SKU-${index + 1}`,
        Cantidad: item.quantity || 0,
        NumeroLinea: index + 1,
      }))
    : [];

    const lineItems = jsonData.line_items;

    // Imprimir todos los elementos en line_items
    lineItems.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      console.log(JSON.stringify(item, null, 2));
      console.log("---------------------------");
    });

  // Función para formatear la fecha
  function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Formatear la fecha de pedido
  const formattedFechaPedido = formatDate(jsonData.created_at);

  // Ajustar dirección
  let direccion1 = destinatario.address1 || '-';

  // Inicializar direccion2 como nulo
  let direccion2 = null;

  // Cortar la dirección1 si es mayor a 40 caracteres
  if (direccion1.length > 40) {
    direccion2 = direccion1.substring(40);
    direccion1 = direccion1.substring(0, 40);
  }

  // Obtener el código de provincia según el código de país
  let codigoProvincia = destinatario.province_code || '-';

  // Modificar el código de provincia si el país es ES (España)
  if (destinatario.country_code === 'ES') {
    // Asignar los dos primeros dígitos del código postal como código de provincia
    codigoProvincia = destinatario.zip.substring(0, 2);
  }
  else{
    //En caso que no sea ES el codigo pais asigna el codigo pais tambien a codigo provincia
    codigoProvincia = destinatario.country_code
  }

  // Crear el objeto XML sin incluir Direccion2 si es nulo
  const xmlObject = {
    Pedidos: {
      Sesion_Cliente: obtenerCodigoSesionCliente(store),
      Pedido: {
        OrderNumber: `#${jsonData.order_number || '-'}`,
        FechaPedido: formattedFechaPedido,
        OrderCustomer: `#${jsonData.order_number || '-'}`,
        ObservAgencia: notasCliente,
        Portes: '1',
        Idioma: 'castellano',
        Destinatario: {
          Empresa: destinatario.company || '-',
          Nombre: destinatario.name || '-',
          Direccion: direccion1,
          // Incluir Direccion2 solo si no es nulo
          ...(direccion2 !== null && { Direccion2: direccion2 }),
          PaisCod: destinatario.country_code || '-',
          ProvinciaCod: codigoProvincia,
          CodigoPostal: destinatario.zip || '-',
          Poblacion: destinatario.city || '-',
          CodigoDestinatario: jsonData.number || '-',
          Phone: destinatario.phone || '-',
          Mobile: destinatario.phone || '-',
          Email: jsonData.email || '-',
        },
        Lineas: {
          Linea: lineas,
        },
      },
    },
  };

  return xmlObject;
}


// Segun en el endpoint donde se ha hecho, escoge un codigo de cliente para que en el Sesion_Cliente del xml este incluido
// Si el codigoSesionCliente cambia en el ABC, tendremos que cambiar este tambien en el .env.
function obtenerCodigoSesionCliente(store) {
  switch (store) {
    case 'printalot-es':
      console.log('Cliente: printalot-es');
      return process.env.PRINTALOT_SESSION_CODE;
    // Agrega más casos según sea necesario
    default:
      console.log('No se ha podido obtener el codigo');
      return 'No se ha podido obtener el codigo';
  }
}

// Para pedidos anteriores
async function sendOrderToWebService(order, store) {
  try {
    // Mapea los datos JSON a XML
    const xmlData = convertirJSToXML(mapJsonToXml(order, store));

    // Envía los datos al webservice
    await enviarDatosAlWebService(xmlData, 'orders');

    console.log('Datos del pedido enviados al webservice con éxito.');
  } catch (error) {
    console.error('Error al enviar datos al webservice:', error);
    throw error;
  }
}

async function getUnfulfilledOrdersAndSendToWebService(store) {
  try {
    const adminApiAccessToken = process.env[`SHOPIFY_ADMIN_API_ACCESS_TOKEN_${store.toUpperCase()}`];

    const response = await axios.get(
      `https://${store}.myshopify.com/admin/api/2024-01/orders.json?status=unfulfilled`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminApiAccessToken,
        },
      }
    );

    const unfulfilledOrders = response.data.orders;
    console.log('Unfulfilled Orders:', unfulfilledOrders);

    // Verifica si hay pedidos no cumplidos antes de intentar enviar al webservice
    if (unfulfilledOrders.length === 0) {
      console.log('No hay pedidos no cumplidos para enviar al webservice.');
      return [];
    }

    // Envía cada orden no cumplida al webservice
    for (const order of unfulfilledOrders) {
      await sendOrderToWebService(order, store);
    }

    return unfulfilledOrders;
  } catch (error) {
    console.error('Error al obtener pedidos no cumplidos o enviar al webservice:', error);
    throw error;
  }
}


//Exporta los modulos
module.exports = { initWebhooks, handleWebhook, handleOrderWebhook, sendOrderToWebService, getUnfulfilledOrdersAndSendToWebService };
