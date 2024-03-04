const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const nodemailer = require('nodemailer');
const winston = require('winston');
const path = require('path');
const db = require('../utils/database');
const mssql = require('mssql');


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
async function initWebhooks(app, providedUrl) {
  try {
    const pool = await db.connectToDatabase();
    const request = pool.request();

    // Hacer una consulta a la base de datos para obtener la información de las tiendas
    const result = await request.query('SELECT NombreEndpoint FROM MiddlewareMagento');
    const stores = result.recordset;

    // Configurar los webhooks para cada tienda
    stores.forEach(store => {
      const ruta = `${providedUrl}${store.NombreEndpoint}/orders/`;
      app.post(ruta, async (req, res) => {
        try {
          const jobData = { tipo: 'orders', req, res, store: store.NombreEndpoint };
          await handleWebhook(jobData);
          res.status(200).send('OK');
        } catch (error) {
          logger.error('Error al procesar el webhook:', error);
          res.status(500).send('Internal Server Error');
        }
      });
    });

    // Establecer un intervalo para procesar la cola
    setInterval(processQueue, 1000);

    // Cerrar la conexión a la base de datos después de configurar los webhooks
    ////await db.closeDatabaseConnection(pool);
  } catch (error) {
    console.error('Error al inicializar los webhooks:', error);
    throw error;
  }
}


async function handleWebhook({ tipo, req, res, store }, retryCount = 0) {
  try {
    if (tipo === 'orders') {
      if (!res.headersSent) {
        res.status(200).send('OK');
      }
      await handleOrderWebhook(req.body, store);
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
    const xmlData = await convertirJSToXML(jsonData, store);

    const response = await enviarDatosAlWebService(xmlData, store);

    console.log(`Respuesta del servicio web para orders:`, response.data);
  } catch (error) {
    logger.error('Error al procesar el webhook de orders:', error);
    throw error;
  }
}

async function enviarDatosAlWebService(xmlData, store) {
  try {

    console.log('XML Data:', xmlData);
    const pool = await db.connectToDatabase();
    const request = pool.request();

    // Hacer una consulta a la base de datos para obtener la URL del servicio web de la tienda
    // Cambiar urlwebservice por solo el nombre del webservice de abc y construir la ruta con la ip y la url
    const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
      .query('SELECT UrlWebService FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');
    
    const urlWebService = result.recordset[0]?.UrlWebService;

    
    
    let urlWebServiceConVariableEntorno;

    if (urlWebService) {
      // Concatenar la variable de entorno al principio
      urlWebServiceConVariableEntorno = process.env.webserviceABC + urlWebService;
    } else {
      console.error('No se encontró un UrlWebService en la base de datos.');
    }
    
    // Cerrar la conexión a la base de datos después de obtener la URL
    ////await db.closeDatabaseConnection(pool);
    
    if (!urlWebServiceConVariableEntorno) {
      throw new Error(`No se encontró la URL del servicio web para la tienda: ${store}`);
    }
    


    const response = await axios.post(urlWebServiceConVariableEntorno, xmlData, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });

    console.log('Respuesta del servicio web:', response.data);
    
    return response;
  } catch (error) {
    logger.error('Error al enviar datos al servicio web:', error);
    throw error;
  }
}

async function convertirJSToXML(data, store) {
  try {
    const xmlObject = await mapJsonToXml(data, store);
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(xmlObject);
    console.log('XML convertido:', xml);
    return xml;
  } catch (error) {
    logger.error('Error al convertir JS a XML:', error);
    throw error;
  }
}

// Mapea los datos JSON a XML 
// Adaptar esto a los datos recibidos por Magento
async function mapJsonToXml(jsonData, store) {
  const sc = await obtenerCodigoSesionCliente(store);
  const destinatario = jsonData.shipping_address || {};

  // Obtener notas del cliente desde note y combinarlas en una cadena separada por comas
  let notasCliente = jsonData.note? jsonData.note : 'Sin observaciones';

  // Add the following lines to handle the case when notasCliente is an empty string
  if (!notasCliente.trim()) {
    notasCliente = ' ';
  }

  let lineas;
  // Obtener lineas
  if (store == 'ami-iyok') {
    lineas = jsonData.line_items
      ? jsonData.line_items.map((item, index) => ({
        CodArticulo: item.sku || `SKU NO INCLUIDO EN EL ARCHIVO`,
        Cantidad: item.quantity || 0,
        NumeroLinea: index + 1,
      })).concat([{
        CodArticulo: 'SACHETKIT', Cantidad: 1, NumeroLinea: jsonData.line_items.length + 1
      }])
      : [];
  } else {
    lineas = jsonData.line_items
      ? jsonData.line_items.map((item, index) => ({
        CodArticulo: item.sku || `SKU NO INCLUIDO EN EL ARCHIVO`,
        Cantidad: item.quantity || 0,
        NumeroLinea: index + 1,
      }))
      : [];
  }

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
  } else {
    //En caso que no sea ES el codigo pais asigna el codigo pais tambien a codigo provincia
    codigoProvincia = destinatario.country_code
  }

  let nombreDestinatario = (destinatario.name || '') + (destinatario.company || '');
  let nombreDestinatario2 = null;
  
  if (nombreDestinatario.length > 80) {
    nombreDestinatario = nombreDestinatario.substring(0, 80);
    nombreDestinatario2 = nombreDestinatario.substring(80);
  }

  // Crear el objeto XML sin incluir Direccion2 si es nulo
  const xmlObject = {
    Pedidos: {
      Sesion_Cliente: sc,
      Pedido: {
        OrderNumber: `#${jsonData.order_number || '-'}`,
        FechaPedido: formattedFechaPedido,
        OrderCustomer: `#${jsonData.order_number || '-'}`,
        ObservAgencia: notasCliente,
        Portes: '1',
        Idioma: 'castellano',
        Destinatario: {
          Empresa: nombreDestinatario,
          ...(nombreDestinatario2 !== null && { Nombre: nombreDestinatario2 }),
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
async function obtenerCodigoSesionCliente(store) {
  try {
    const pool = await db.connectToDatabase();
    const request = pool.request();

    // Hacer una consulta a la base de datos para obtener el SessionCode de la tienda
    const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
      .query('SELECT SessionCode FROM MiddlewareMagento WHERE NombreEndpoint = @NombreEndpoint');

    
    const sessionCode = result.recordset[0]?.SessionCode;


    // Cerrar la conexión a la base de datos después de obtener la información necesaria
    //await db.closeDatabaseConnection(pool);

    if (!sessionCode) {
      console.log('No se ha podido obtener el SessionCode para la tienda:', store);
      return 'No se ha podido obtener el SessionCode';
    }
    return sessionCode;
  } catch (error) {
    console.error('Error al obtener el SessionCode desde la base de datos:', error);
    throw error;
  }
}


// Para pedidos anteriores
async function sendOrderToWebService(order, store) {

  try {
    // Mapea los datos JSON a XML
    const xmlData = await convertirJSToXML(order, store);

    // Envía los datos al webservice
    await enviarDatosAlWebService(xmlData, store);

    console.log('Datos del pedido enviados al webservice con éxito.');
  } catch (error) {
    console.error('Error al enviar datos al webservice:', error);
    throw error;
  }
}



//Exporta los modulos
module.exports = { initWebhooks, handleWebhook, handleOrderWebhook, sendOrderToWebService };