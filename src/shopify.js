// shopify.js

const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const nodemailer = require('nodemailer');
const winston = require('winston');

require('dotenv').config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/error.log', level: 'error' }),
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/combined.log' }),
  ],
});

const queue = [];

const maxRetries = 10;
const retryInterval = 10 * 60 * 1000; // 10 minutos en milisegundos

// Función para manejar reintentos y notificaciones por correo electrónico
async function handleRetry(job, retryCount) {
  if (retryCount < maxRetries) {
    console.log(`Reintentando trabajo después de ${retryInterval / 1000} segundos. Intento ${retryCount + 1}/${maxRetries}`);
    setTimeout(async () => {
      await handleWebhook(job, retryCount + 1);
    }, retryInterval);
  } else {
    // Envía un correo electrónico al admin en caso de 10 intentos fallidos
    sendErrorEmail(job, retryCount);
    logger.error(`El trabajo ha fallado después de ${maxRetries} intentos. Tipo: ${job.tipo}`);
  }
}

// Función para enviar un correo electrónico en caso de errores persistentes
function sendErrorEmail(job, retryCount) {
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error al enviar correo electrónico:', error);
    } else {
      console.log('Correo electrónico enviado:', info.response);
    }
  });
}

async function processQueue() {
  while (queue.length > 0) {
    const job = queue.shift(); // Obtener el trabajo más antiguo de la cola

    try {
      await handleWebhook(job);
    } catch (error) {
      console.error(`Error al procesar el trabajo:`, error);

      // Manejar reintentos o notificaciones por correo electrónico aquí
    }
  }
}

function addToQueue(jobData) {
  queue.push(jobData);
  processQueue(); // Iniciar el procesamiento de la cola
}

function initWebhooks(app, serverUrl) {
  const webhooks = [
    { tipo: 'orders', ruta: '/shopify-webhook/orders' },
  ];

  webhooks.forEach(webhook => {
    const rutaWebhook = `${serverUrl}${webhook.ruta}`;

    app.post(rutaWebhook, (req, res) => {
      const jobData = { tipo: webhook.tipo, req, res };
      addToQueue(jobData);
      res.status(200).send('OK');
    });
  });

  
  setInterval(processQueue, 1000);
}

async function handleWebhook({ tipo, req, res }, retryCount = 0) {
  const data = req.body.toString('utf8');
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  // Verificar firma, convertir XML a JS y verificar datos
  if (verificarFirmaWebhook(data, hmacHeader)) {
    const datosJS = await convertirXMLaJS(data);

    if (verificarDatos(datosJS)) {
      try {
        const response = await enviarDatosAlWebService(datosJS, tipo);
        console.log(`Respuesta del servicio web para ${tipo}:`, response.data);
        res.status(200).send('OK');
      } catch (error) {
        // Manejar error y reintentar
        console.error(`Error al enviar datos al servicio web para ${tipo}:`, error);
        await handleRetry({ tipo, req, res }, retryCount);
      }
    } else {
      logger.error(`Datos incorrectos para ${tipo}`);
      throw new Error('Datos incorrectos');
    }
  } else {
    logger.error(`Firma incorrecta para ${tipo}`);
    throw new Error('Firma incorrecta');
  }
}

function verificarFirmaWebhook(data, hmacHeader) {
  const secret = process.env.SHARED_SECRET; // Cambia por tu clave secreta compartida
  const hmac = crypto.createHmac('sha256', secret);
  const contenido = Buffer.from(data, 'utf-8');
  hmac.update(contenido);
  const hashCalculado = hmac.digest('base64');
  return hashCalculado === hmacHeader;
}

function convertirXMLaJS(data) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function verificarDatos(datos) {
  // Implementa la lógica de verificación de datos según tus necesidades
  return true; // Cambia esto según tus necesidades
}

async function enviarDatosAlWebService(datos, tipo) {
  const urlWebService = `https://webservice.disnet.es:30000/${tipo}`;
  return axios.post(urlWebService, { datos });
}

module.exports = { initWebhooks, handleWebhook };
