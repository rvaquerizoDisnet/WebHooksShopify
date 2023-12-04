// FW para manejar solicitudes http
const express = require('express');
// Librería para analizar y procesar solicitudes http
const bodyParser = require('body-parser');
// Para manejar eventos http
const axios = require('axios');
// Para poder recibir desde otro dominio
const cors = require('cors');
// Para el cifrado y descifrado de las claves
const crypto = require('crypto');
// Para manejar xml
const xml2js = require('xml2js');
// Para crear un log
const winston = require('winston'); 
// Para servicio de envio de correo automatico
const nodemailer = require('nodemailer');
const { getDefaultAutoSelectFamily } = require('net');
const { Queue, Worker } = require('bull');
require('dotenv').config();


const app = express();
const port = 3000;
//Falta decidir en que puerto estar el webhook
const portWebhook = 3333;

// Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebServices/log/error.log', level: 'error' }),
    new winston.transports.File({ filename: '//NAS/L/INFORMATICA/WebService/log/combined.log' }),
  ],
});


// Configuración de nodemailer (debes reemplazar con tus propias credenciales y configuraciones)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});


// Añadir la clave secreta de Shopify para cada cliente
// Modificar el nombre del cliente por el mismo que añadimos en el array de clientes
//Datos de ejemplo
const secretKeys = {
  cliente1: process.env.SECRET_KEY_CLIENTE1,
  cliente2: process.env.SECRET_KEY_CLIENTE2,
  cliente3: process.env.SECRET_KEY_CLIENTE3,
};


app.use(bodyParser.text({ type: 'application/xml' }));
app.use(cors());

// Array de objetos con el nombre de los clientes y sus códigos correspondientes
//Datos de ejemplo
const clientes = [
  { nombre: 'cliente1', codigo: 'codigo_cliente1' },
  { nombre: 'cliente2', codigo: 'codigo_cliente2' },
  { nombre: 'cliente3', codigo: 'codigo_cliente3' },
];

// Configurar la cola de trabajo
const workQueue = new Queue('webhook-work');

// Configurar los endpoints a los que queremos escuchar
clientes.forEach(cliente => {
  const rutaPedidos = `https://disnet.es:${portWebhook}/${cliente.nombre}/webhook/pedidos`;
  const rutaActualizacionPedidos = `https://disnet.es:${portWebhook}/${cliente.nombre}/webhook/actualizacion_pedidos`;


 // Middleware para manejar los webhooks de Shopify - Pedido
 app.post(rutaPedidos, async (req, res) => {
  await workQueue.add({ cliente, tipo: 'pedidos', req, res });
  res.status(200).send('En cola de trabajo');
});

  // Middleware para manejar los webhooks de Shopify - Actualización de Pedidos
  app.post(rutaActualizacionPedidos, async (req, res) => {
    await workQueue.add({ cliente, tipo: 'actualizacion_pedidos', req, res });
    res.status(200).send('En cola de trabajo');
  });

  //Se podrian añadir todos los webhooks que queramos y que hayamos creado en Shopify
});


// Procesador para la cola de trabajo
new Worker('webhook-work', async job => {
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

// Función para verificar la firma de cada cliente y así poder acceder
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
  // Añadir la función para verificar los datos
  return true;
}


//Envia los datos al webservice
async function enviarDatosAlWebService(datos, cliente, tipo) {
  const urlWebService = `https://webservice.disnet.es:30000/${cliente.codigo}${tipo}`;
  return axios.post(urlWebService, { datos });
}

//Es una funcion para reintentar un proceso fallido, normalmente esperamos 10 minutos y lo reintentamos 10 veces.
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


  // Si todos los intentos fallan, enviar notificación por correo electrónico
  await enviarCorreoElectronico(cliente, tipo);
  logger.error(`Reintento fallido para ${cliente.nombre}/${tipo}. Enviada notificación por correo electrónico.`);
}


//Si han fallado los intentos anteriores, envia un correo para avisar.
async function enviarCorreoElectronico(cliente, tipo) {
  try {
    // Cambiar el correo este, por uno real (crearlo)
    const mailOptions = {
      from: 'tucorreo@gmail.com',
      to: 'destinatario@ejemplo.com',
      subject: `Error en el webhook para ${cliente.nombre}/${tipo}`,
      text: `Se ha producido un error en el webhook para ${cliente.nombre}/${tipo}.`,
    };

    // Envía el correo electrónico
    await transporter.sendMail(mailOptions);
    console.log(`Correo electrónico de notificación enviado para ${cliente.nombre}/${tipo}.`);
  } catch (error) {
    console.error(`Error al enviar el correo electrónico de notificación:`, error);
  }
}

//Esperar el tiempo en ms, no en segundos, si quieres pasarlo en segundos los tienes que convertir como arriba hemos hecho.
function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Puerto donde estara escuchando el servidor los webhooks
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});


