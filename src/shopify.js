
const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const winston = require('winston');
const nodemailer = require('nodemailer');
const { Worker, QueueScheduler } = require('bull');
const { Queue } = require('bull');

require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const secretKeys = {
  cliente1: process.env.SECRET_KEY_CLIENTE1,
  cliente2: process.env.SECRET_KEY_CLIENTE2,
  cliente3: process.env.SECRET_KEY_CLIENTE3,
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/error.log', level: 'error' }),
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/Shopify/Pedidos/combined.log' }),
  ],
});

const workQueue = new Queue('webhook-work');
const scheduler = new QueueScheduler('webhook-work');

const shopifyWebhookUrl = 'https://shopify.disnet.es/';

function initWebhooks(app) {
  const clientes = [
    { nombre: 'cliente1', codigo: 'codigo_cliente1' },
    { nombre: 'cliente2', codigo: 'codigo_cliente2' },
    { nombre: 'cliente3', codigo: 'codigo_cliente3' },
  ];

  clientes.forEach(cliente => {
    const rutaPedidos = `https://shopify.disnet.es/`;
    const rutaActualizacionPedidos = `https://shopify.disnet.es/`;

    app.post(rutaPedidos, async (req, res) => {
      try {
      await workQueue.add({ cliente, tipo: 'pedidos', req, res });
      res.status(200).send('En cola de trabajo');
    } catch (error) {
      logger.error('Error al agregar trabajo a la cola:', error);
      res.status(500).send('Error interno del servidor');
    }
    });
    
    app.post(rutaActualizacionPedidos, async (req, res) => {
      try {
        await workQueue.add({ cliente, tipo: 'actualizacion_pedidos', req, res });
      res.status(200).send('En cola de trabajo');
    } catch (error) {
      logger.error('Error al agregar trabajo a la cola:', error);
      res.status(500).send('Error interno del servidor');
    }
    });
  });
}

function initQueueProcessor() {
  const processor = new Worker('webhook-work', async job => {
    const { cliente, tipo, req, res } = job.data;
    const data = req.body.toString('utf8');
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

    if (verificarFirmaWebhook(data, hmacHeader, secretKeys[cliente.nombre])) {
      try {
        const datosJS = await convertirXMLaJS(data);

        if (verificarDatos(datosJS)) {
          const response = await enviarDatosAlWebService(datosJS, cliente, tipo);
          console.log(`Respuesta del servicio web para ${cliente.nombre}/${tipo}:`, response.data);
          res.status(200).send('OK');
        } else {
          logger.error(`Datos incorrectos para ${cliente.nombre}/${tipo}`);
          await reintentarDespuesDe(cliente, tipo, 10, 10, data, hmacHeader);
          res.status(400).send('Datos incorrectos');
        }
      } catch (error) {
        logger.error(`Error al manejar el webhook para ${cliente.nombre}/${tipo}:`, error);
        await reintentarDespuesDe(cliente, tipo, 10, 10, data, hmacHeader);
        res.status(500).send('Error interno del servidor');
      }
    } else {
      logger.error(`Firma incorrecta para ${cliente.nombre}/${tipo}`);
      await reintentarDespuesDe(cliente, tipo, 10, 10, data, hmacHeader);
      res.status(401).send('Firma incorrecta');
    }
  });
  // Puedes agregar event listeners o manejar eventos relacionados con el Worker si es necesario
}

function verificarFirmaWebhook(data, hmacHeader, secret) {
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
        logger.error('Error al convertir XML a JS:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


function verificarDatos(datos) {
  return false; // Implementa la lógica de verificación de datos según tus necesidades
}

async function enviarDatosAlWebService(datos, cliente, tipo) {
  const urlWebService = `https://webservice.disnet.es:30000/${cliente.codigo}${tipo}`;
  try {
    const response = await axios.post(urlWebService, { datos });
    return response;
  } catch (error) {
    logger.error(`Error al enviar datos al servicio web para ${cliente.nombre}/${tipo}:`, error);
    throw error; // Propaga el error para que sea manejado en el lugar apropiado
  }
}

async function reintentarDespuesDe(cliente, tipo, intentos, minutosEspera, dataOriginal, hmacHeaderOriginal) {
  for (let i = 1; i <= intentos; i++) {
    console.log(`Reintentando ${cliente.nombre}/${tipo}. Intento ${i} de ${intentos}.`);
    await esperar(minutosEspera * 60 * 1000);

    if (verificarFirmaWebhook(dataOriginal, hmacHeaderOriginal, secretKeys[cliente.nombre])) {
      try {
        const datosJS = await convertirXMLaJS(dataOriginal);
        if (verificarDatos(datosJS)) {
          const response = await enviarDatosAlWebService(datosJS, cliente, tipo);
          console.log(`Respuesta del servicio web para ${cliente.nombre}/${tipo}:`, response.data);
          logger.info(`Reintento exitoso para ${cliente.nombre}/${tipo}.`);
          return;
        }
      } catch (error) {
        logger.error(`Error en el reintento para ${cliente.nombre}/${tipo}:`, error);
      }
    } else {
      logger.error(`Firma incorrecta en el reintento para ${cliente.nombre}/${tipo}.`);
    }
  }

  await enviarCorreoElectronico(cliente, tipo);
  logger.error(`Reintento fallido para ${cliente.nombre}/${tipo}. Enviada notificación por correo electrónico.`);
}

async function enviarCorreoElectronico(cliente, tipo) {
  try {
    const mailOptions = {
      from: 'tucorreo@gmail.com',
      to: 'destinatario@ejemplo.com',
      subject: `Error en el webhook para ${cliente.nombre}/${tipo}`,
      text: `Se ha producido un error en el webhook para ${cliente.nombre}/${tipo}.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo electrónico de notificación enviado para ${cliente.nombre}/${tipo}.`);
  } catch (error) {
    console.error(`Error al enviar el correo electrónico de notificación:`, error);
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { initWebhooks, initQueueProcessor, verificarFirmaWebhook, convertirXMLaJS, verificarDatos, enviarDatosAlWebService, reintentarDespuesDe, enviarCorreoElectronico, esperar };