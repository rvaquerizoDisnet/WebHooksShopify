// shopify.js

// importaciones necesarias
const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const nodemailer = require('nodemailer');
const winston = require('winston');

require('dotenv').config();


//Archivos para el log
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/Log/error.log', level: 'error' }),
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/Log/combined.log' }),
  ],
});


//Configuracion de la cola de trabajo
const queue = [];

const maxRetries = 10;
const retryInterval = 10 * 60 * 1000; // 10 minutos en milisegundos

//Reintentos
async function handleRetry(job, retryCount) {
  try {
    if (retryCount < maxRetries) {
      logger.info(`Reintentando trabajo después de ${retryInterval / 1000} segundos. Intento ${retryCount + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      await handleWebhook(job, retryCount + 1);
    } else {
      await sendErrorEmail(job, retryCount);
      logger.error(`El trabajo ha fallado después de ${maxRetries} intentos. Tipo: ${job.tipo}`);
      console.error(`El trabajo ha fallado después de ${maxRetries} intentos. Tipo: ${job.tipo}`);
    }
  } catch (error) {
    logger.error('Error en handleRetry:', error);
  }
}


// Envio de correo automatico al administrador para avisar que despues de 10 intentos un pedido no se ha procesado
async function sendErrorEmail(job, retryCount) {
  try {
    const transporter = nodemailer.createTransport({
      // Configuración del transporte de correo electrónico (SMTP, etc.)
      // Consulta la documentación de nodemailer para obtener más detalles: https://nodemailer.com/about/
    });

    const mailOptions = {
      from: 'your-email@example.com',
      to: 'admin@example.com',
      subject: `Error en el trabajo tipo ${job.tipo}`,
      text: `El trabajo ha fallado después de ${retryCount} intentos. Detalles: ${JSON.stringify(job)}`,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo electrónico enviado:', info.response);
  } catch (error) {
    logger.error('Error en sendErrorEmail:', error);
  }
}

//Cola de trabajo 
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

// Añade a la cola los procesos
function addToQueue(jobData) {
  queue.push(jobData);
  processQueue();
}

// Inicia los webhooks en ngrokUrl
function initWebhooks(app, ngrokUrl) {
  console.log("Ha entrado en initWebhooks");
  const stores = [
    { name: 'printalot', route: '/shopify-webhook/printalot/orders' },
    // Agrega más tiendas según tus necesidades
  ];


  stores.forEach(store => {
    const rutaWebhook = `${ngrokUrl}${store.route}`;

    app.post(rutaWebhook, (req, res) => {
      const jobData = { tipo: 'orders', req, res, store: store.name };
      addToQueue(jobData);
      res.status(200).send('OK');
      console.log("initWebhooks2");
    });
  });

  setInterval(processQueue, 1000);
}


// Funcion donde llamamos al resto para hacer comprobacion de datos y el post al webservice
async function handleWebhook({ tipo, req, res, store }, retryCount = 0) {
  try {
    const jsonData = req.body;
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    console.log('Request Body:', jsonData);
    console.log('Received HMAC:', hmacHeader);
    
    if (jsonData, hmacHeader) {
      const xmlData = convertirJSToXML(mapJsonToXml(jsonData, store));
      //Esto esta comentado para no hacer POST todavia, no se como se hace
      //const response = await enviarDatosAlWebService(xmlData, tipo);
      const response = xmlData;
      console.log(`Respuesta del servicio web para ${tipo}:`, response.data);
      res.status(200).send('OK');
    } else {
      logger.error(`Firma incorrecta para ${tipo}`);
      throw new Error('Firma incorrecta');
    }
  } catch (error) {
    logger.error('Error en handleWebhook:', error);
    await handleRetry({ tipo, req, res, store }, retryCount);
  }
}


// Envio de datos al webservice
async function enviarDatosAlWebService(data, tipo) {
  const urlWebService = 'http://webservice.disnet.es:30000/00GENShopify';

  try {
    const xmlData = convertirJSToXML(mapJsonToXml(data));
    console.log('XML enviado:', xmlData);
    const response = await axios.post(urlWebService, xmlData, {
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

// Convierte el JS a un XML
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

// Mapea los datos JSON a xml
function mapJsonToXml(jsonData, store) {
  const destinatario = jsonData.shipping_address || {};

  const lineas = jsonData.line_items ? jsonData.line_items.map((item, index) => ({
    CodArticulo: item.sku || `SKU-${index + 1}`,
    Cantidad: item.quantity || 0,
    NumeroLinea: index + 1,
    Lote: '',  // Agrega los datos correspondientes
    Bloqueado: '',  // Agrega los datos correspondientes
    TipoStock: '',  // Agrega los datos correspondientes
  })) : [];

  return {
    Pedidos: {
      Sesion_Cliente: obtenerCodigoSesionCliente(store),
      Pedido: {
        OrderNumber: jsonData.order_number || '',
        FechaPedido: jsonData.created_at || '',
        OrderCustomer: jsonData.email || '',
        ObservAgencia: '',
        Portes: '',
        Idioma: 'castellano',
        Destinatario: {
          Empresa: destinatario.company || '',
          Nombre: destinatario.name || '',
          Direccion: destinatario.address1 || '',
          Direccion2: destinatario.address2 || '',
          PaisCod: destinatario.country_code || '',
          PaisNom: destinatario.country || '',
          ProvinciaCod: destinatario.province_code || '',
          ProvinciaNom: destinatario.province || '',
          CodigoPostal: destinatario.zip || '',
          Poblacion: destinatario.city || '',
          CodigoDestinatario: '',
          Phone: destinatario.phone || '',
          Mobile: destinatario.phone || '',
          Email: jsonData.email || '',
          NumCliente: '',
        },
        Lineas: {
          Linea: lineas,
        },
      },
    },
  };
}

// Segun en el endpoint donde se ha hecho, escoge un codigo de cliente para que en el Sesion_Cliente del xml este incluido
// Si el codigoSesionCliente cambia en el ABC, tendremos que cambiar este tambien.
function obtenerCodigoSesionCliente(store) {
  switch (store) {
    case 'printalot':
      console.log('Cliente: printalot, Código de sesión: 1345');
      //Codigo de prueba
      return '1345';
    // Agrega más casos según sea necesario
    default:
      console.log('Cliente desconocido, usando código predeterminado');
      return 'default_code';  // Código predeterminado si no se encuentra el cliente
  }
}

//Exporta los modulos
module.exports = { initWebhooks, handleWebhook };
