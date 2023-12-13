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


// Envio de correo automatico al administrador para avisar que después de 10 intentos un pedido no se ha procesado
async function sendErrorEmail(job, retryCount) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'outlook',
      auth: {
        user: process.env.EMAIL_USER, // Correo electrónico del remitente
        pass: process.env.EMAIL_PASSWORD, // Contraseña del remitente
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Correo electrónico del destinatario
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

// Inicia los webhooks en la URL proporcionada
function initWebhooks(app, providedUrl) {
  const stores = [
    { name: 'printalot', route: '/shopify-webhook/printalot/orders' },
    // Agrega más tiendas según tus necesidades
  ];

  stores.forEach(store => {
    const rutaWebhook = `${providedUrl}${store.route}`;

    app.post(rutaWebhook, (req, res) => {
      const jobData = { tipo: 'orders', req, res, store: store.name };
      addToQueue(jobData);
      res.status(200).send('OK');
    });
  });

  setInterval(processQueue, 1000);
}

// Funcion donde llamamos al resto para hacer comprobacion de datos y el post al webservice
async function handleWebhook({ tipo, req, res, store }, retryCount = 0) {
  try {
    const jsonData = req.body;
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    
    if (jsonData, hmacHeader) {
      const xmlData = convertirJSToXML(mapJsonToXml(jsonData, store));
      const response = await enviarDatosAlWebService(xmlData, tipo);
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

// Mapea los datos JSON a XML
function mapJsonToXml(jsonData, store) {
  const destinatario = jsonData.shipping_address || {};

  const lineas = jsonData.line_items
    ? jsonData.line_items.map((item, index) => ({
        CodArticulo: item.sku || `SKU-${index + 1}`,
        Cantidad: item.quantity || 0,
        NumeroLinea: index + 1,
      }))
    : [];

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
  let direccion1 = destinatario.address1 || '';

  // Inicializar direccion2 como nulo
  let direccion2 = null;

  // Cortar la dirección1 si es mayor a 40 caracteres
  if (direccion1.length > 40) {
    direccion2 = direccion1.substring(40);
    direccion1 = direccion1.substring(0, 40);
  }

  // Obtener el código de provincia según el código de país
  let codigoProvincia = destinatario.province_code || '';

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
        OrderNumber: jsonData.order_number || '',
        FechaPedido: formattedFechaPedido,
        OrderCustomer: jsonData.email || '',
        ObservAgencia: 'Sin observaciones',
        Portes: '1',
        Idioma: 'castellano',
        Destinatario: {
          Empresa: destinatario.company || '',
          Nombre: destinatario.name || '',
          Direccion: direccion1,
          // Incluir Direccion2 solo si no es nulo
          ...(direccion2 !== null && { Direccion2: direccion2 }),
          PaisCod: destinatario.country_code || '',
          // PaisNom: destinatario.country || '',
          ProvinciaCod: codigoProvincia,
          // ProvinciaNom: destinatario.province || '',
          CodigoPostal: destinatario.zip || '',
          Poblacion: destinatario.city || '',
          CodigoDestinatario: jsonData.number || '',
          Phone: destinatario.phone || '',
          Mobile: destinatario.phone || '',
          Email: jsonData.email || '',
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
    case 'printalot':
      console.log('Cliente: printalot');
      return process.env.PRINTALOT_SESSION_CODE;
    // Agrega más casos según sea necesario
    default:
      console.log('No se ha podido obtener el codigo');
      return 'No se ha podido obtener el codigo';
  }
}

//Exporta los modulos
module.exports = { initWebhooks, handleWebhook };