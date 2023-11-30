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

const app = express();
// Puerto (configurar donde más nos convenga)
const port = 3000;

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

// Añadir la clave secreta de Shopify para cada cliente
// Modificar el nombre del cliente por el mismo que añadimos en el array de clientes
//Datos de ejemplo
const secretKeys = {
  cliente1: 'clave_secreta_cliente1',
  cliente2: 'clave_secreta_cliente2',
  cliente3: 'clave_secreta_cliente3',
};

// Array con el nombre de los clientes y sus códigos correspondientes
//Datos de ejemplo
const clientes = ['cliente1', 'cliente2', 'cliente3'];
const codigosClientes = ['11TestPedidos', '12OtroCliente', '13ClienteEjemplo'];

clientes.forEach((cliente, index) => {
  const codigoCliente = codigosClientes[index];
  const rutaPedidos = `/${cliente}/webhook/pedidos`;
  const rutaActualizacionPedidos = `/${cliente}/webhook/actualizacion_pedidos`;

  // Middleware para manejar los webhooks de Shopify - Pedido
  app.post(rutaPedidos, (req, res) => {
    manejarWebhook(codigoCliente, 'pedidos', req, res);
  });

  // Middleware para manejar los webhooks de Shopify - Actualización de Pedidos
  app.post(rutaActualizacionPedidos, (req, res) => {
    manejarWebhook(codigoCliente, 'actualizacion_pedidos', req, res);
  });
});

// Función para verificar la firma de cada cliente y así poder acceder
function verificarFirmaWebhook(data, hmacHeader, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const contenido = Buffer.from(data, 'utf-8');
  hmac.update(contenido);
  const hashCalculado = hmac.digest('base64');

  return hashCalculado === hmacHeader;
}

async function manejarWebhook(codigoCliente, tipo, req, res) {
  const data = req.body.toString('utf8');
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (verificarFirmaWebhook(data, hmacHeader, secretKeys[codigoCliente])) {
    try {
      const datosJS = await convertirXMLaJS(data);
      if (verificarDatos(datosJS)) {
        const response = await enviarDatosAlWebService(datosJS, codigoCliente, tipo);
        console.log(`Respuesta del servicio web para ${codigoCliente}/${tipo}:`, response.data);
        res.status(200).send('OK');
      } else {
        logger.error(`Datos incorrectos para ${codigoCliente}/${tipo}`);
        res.status(400).send('Datos incorrectos');
      }
    } catch (error) {
      logger.error(`Error al manejar el webhook para ${codigoCliente}/${tipo}:`, error);
      res.status(500).send('Error interno del servidor');
    }
  } else {
    logger.error(`Firma incorrecta para ${codigoCliente}/${tipo}`);
    res.status(401).send('Firma incorrecta');
  }
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

// Falta cambiar el nombre del cliente por su código
function enviarDatosAlWebService(datos, codigoCliente, tipo) {
  // Añadir la URL de nuestro webservice en la constante de abajo
  const urlWebService = `https://tu-servicio-web.com/${codigoCliente}${tipo}`;
  return axios.post(urlWebService, { datos });
}

//Funcion que envie un correo para avisar que esta habiendo un error y asi poder comprobarlo manualmente
function enviarCorreo(){

}

// Middleware escuchando en el puerto que hemos definido arriba (normalmente el 3000)
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
