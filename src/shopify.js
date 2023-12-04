const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { Queue } = require('bull');
const crypto = require('crypto');
const xml2js = require('xml2js');
const winston = require('winston');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = 3000;
const portWebhook = 3333;

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
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/log/error.log', level: 'error' }),
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebService/log/combined.log' }),
  ],
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const workQueue = new Queue('webhook-work');

function initWebhooks(app) {
  const clientes = [
    { nombre: 'cliente1', codigo: 'codigo_cliente1' },
    { nombre: 'cliente2', codigo: 'codigo_cliente2' },
    { nombre: 'cliente3', codigo: 'codigo_cliente3' },
  ];

  clientes.forEach(cliente => {
    const rutaPedidos = `https://disnet.es:${portWebhook}/${cliente.nombre}/webhook/pedidos`;
    const rutaActualizacionPedidos = `https://disnet.es:${portWebhook}/${cliente.nombre}/webhook/actualizacion_pedidos`;

    app.post(rutaPedidos, async (req, res) => {
      await workQueue.add({ cliente, tipo: 'pedidos', req, res });
      res.status(200).send('En cola de trabajo');
    });

    app.post(rutaActualizacionPedidos, async (req, res) => {
      await workQueue.add({ cliente, tipo: 'actualizacion_pedidos', req, res });
      res.status(200).send('En cola de trabajo');
    });
  });
}

function initQueueProcessor() {
  const workQueue = new Worker('webhook-work', async job => {
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
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function verificarDatos(datos) {
  return true; // Implementa la lógica de verificación de datos según tus necesidades
}

async function enviarDatosAlWebService(datos, cliente, tipo) {
  const urlWebService = `https://webservice.disnet.es:30000/${cliente.codigo}${tipo}`;
  return axios.post(urlWebService, { datos });
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

// Inicializar webhooks
initWebhooks(app);

// Inicializar cola de trabajo y procesador
initQueueProcessor();

// Puerto donde estará escuchando el servidor los webhooks
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
