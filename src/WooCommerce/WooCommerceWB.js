const xml2js = require('xml2js');
const axios = require('axios');
const nodemailer = require('nodemailer');
const winston = require('winston');
const path = require('path');
const db = require('../utils/database');

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

async function initWebhooks(app, providedUrl) {
  try {
    const pool = await db.connectToDatabase(2);
    const request = pool.request();

    // Hacer una consulta a la base de datos para obtener la información de las tiendas
    const result = await request.query('SELECT NombreEndpoint FROM MiddlewareWooCommerce');
    const stores = result.recordset;

    // Configurar los webhooks para cada tienda usando un bucle for...of
    for (const store of stores) {
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
    }

    // Establecer un intervalo para procesar la cola
    setInterval(processQueue, 1000);

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
    } else if (tipo === 'shipments') {
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
    const response = await enviarDatosAlWebService(xmlData, store);

    console.log(`Respuesta del servicio web para orders:`, response.data);
  } catch (error) {
    logger.error('Error al procesar el webhook de orders:', error);
    throw error;
  }
}

async function enviarDatosAlWebService(xmlData, store) {
  try {
    const pool = await db.connectToDatabase(2);
    const request = pool.request();

    const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
      .query('SELECT UrlWebService FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
    
    const urlWebService = result.recordset[0]?.UrlWebService;
    
    // Verificar si urlWebService tiene un valor
    if (urlWebService) {
      // Concatenar la variable de entorno al principio
      const urlWebServiceConVariableEntorno = process.env.webserviceABC + urlWebService;
      console.log(urlWebServiceConVariableEntorno);
    } else {
      console.error('No se encontró un UrlWebService en la base de datos.');
    }

    // Cerrar la conexión a la base de datos después de obtener la URL
    //await db.closeDatabaseConnection(pool);

    if (!urlWebService) {
      throw new Error(`No se encontró la URL del servicio web para la tienda: ${store}`);
    }

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

// Cambir esto cuando sepamos como es la estructura de datos
function mapJsonToXml(jsonData, store) {
  const destinatario = jsonData.shipping || {};


  // Obtener los detalles del pedido
  const lineItems = jsonData.line_items || [];

  // Mapear los elementos de la línea de artículos
  const mappedLineItems = lineItems.map((item, index) => ({
    CodArticulo: item.sku || `SKU NO INCLUIDO EN EL ARCHIVO`,
    Cantidad: item.quantity || 0,
    NumeroLinea: index + 1,
  }));


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
  let codigoProvincia = destinatario.state || '-';

  // Modificar el código de provincia si el país es ES (España)
  if (destinatario.country === 'ES') {
    // Asignar los dos primeros dígitos del código postal como código de provincia
    codigoProvincia = destinatario.zip.substring(0, 2);
  }
  else{
    //En caso que no sea ES el codigo pais asigna el codigo pais tambien a codigo provincia
    codigoProvincia = destinatario.country_code
  }

   // Asignación del campo Empresa y Nombre
   let nombreDestinatario = destinatario.name || '-';
   let empresaDestinatario = destinatario.company || '-';
 
   // Si la empresa es '-' y el nombre no lo es, asigna el nombre a la empresa
   if (empresaDestinatario === '-') {
     empresaDestinatario = nombreDestinatario;
   }

  // Crear el objeto XML sin incluir Direccion2 si es nulo
  const xmlObject = {
    Pedidos: {
      Sesion_Cliente: obtenerCodigoSesionCliente(store),
      Pedido: {
        OrderNumber: `#${jsonData.number || 'No encontrado'}`,
        FechaPedido: formattedFechaPedido,
        OrderCustomer: `#${jsonData.number || 'No encontrado'}`,
        ObservAgencia: 'Sin observaciones',
        Portes: '1',
        Idioma: 'castellano',
        Destinatario: {
          Empresa: empresaDestinatario,
          Nombre: nombreDestinatario,
          Direccion: direccion1,
          // Incluir Direccion2 solo si no es nulo
          ...(direccion2 !== null && { Direccion2: direccion2 }),
          PaisCod: destinatario.country || 'No encontrado',
          ProvinciaCod: codigoProvincia,
          CodigoPostal: destinatario.postcode || 'No encontrado',
          Poblacion: destinatario.city || 'No encontrado',
          CodigoDestinatario: jsonData.number || 'No encontrado',
          Phone: jsonData.billing.phone || 'No proporcionado',
          Mobile: jsonData.billing.phone || 'No proporcionado',
          Email: jsonData.billing.email || 'No proporcionado',
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
    const pool = await db.connectToDatabase(2);
    const request = pool.request();

    // Hacer una consulta a la base de datos para obtener el SessionCode de la tienda
    const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
      .query('SELECT SessionCode FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
    
    const sessionCode = result.recordset[0]?.SessionCode;

    // Cerrar la conexión a la base de datos después de obtener la información necesaria
    //await db.closeDatabaseConnection(pool);

    if (!sessionCode) {
      console.log('No se ha podido obtener el SessionCode para la tienda:', store);
      return 'No se ha podido obtener el SessionCode';
    }

    console.log(`Cliente: ${store}`);
    return sessionCode;
  } catch (error) {
    console.error('Error al obtener el SessionCode desde la base de datos:', error);
    throw error;
  }
}


// Para pedidos anteriores
async function sendOrderToWebService(order, store) {
  console.log('Store en sendOrderToWebService:', store);
  try {
    // Mapea los datos JSON a XML
    const xmlData = convertirJSToXML(mapJsonToXml(order, store));

    // Envía los datos al webservice
    await enviarDatosAlWebService(xmlData, store);

    console.log('Datos del pedido enviados al webservice con éxito.');
  } catch (error) {
    console.error('Error al enviar datos al webservice:', error);
    throw error;
  }
}

async function getUnfulfilledOrdersAndSendToWebService(store) {
  console.log('Valor de store en getUnfulfilledOrdersAndSendToWebService:', store);
  /*try {
    //Cambiar esto para obtenerSecretsTienda
    const adminApiAccessToken = await obtenerSecretsTienda(store);

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
    console.log('Store en getUnfulfilledOrdersAndSendToWebService:', store);
    for (const order of unfulfilledOrders) {
      await sendOrderToWebService(order, store);
    }

    return unfulfilledOrders;
  } catch (error) {
    console.error('Error al obtener pedidos no cumplidos o enviar al webservice:', error);
    throw error;
  }*/
}

async function obtenerSecretsTienda(store) {
    try {
      const pool = await db.connectToDatabase(2);
      const request = pool.request();
  
      // Hacer una consulta a la base de datos para obtener el Secrets de la tienda
      const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
        .query('SELECT ApiSecret, ApiKey FROM MiddlewareWooCommerce WHERE NombreEndpoint = @NombreEndpoint');
      
      const ApiSecret = result.recordset[0]?.ApiSecret;
      const ApiKey = result.recordset[0]?.ApiKey;
  
      // Cerrar la conexión a la base de datos después de obtener la información necesaria
      //await db.closeDatabaseConnection(pool);
  
      if (!ApiSecret || !ApiKey) {
        console.log('No se ha podido obtener el ApiKey o el ApiSecret para la tienda:', store);
        throw new Error('No se ha podido obtener el Secrets');
      }
  
      return { ApiSecret, ApiKey };
    } catch (error) {
      console.error('Error al obtener los Secrets desde la base de datos:', error);
      throw error;
    }
  }


  //Cancelacion de pedidos
async function handleOrderWebhookCanceled(jsonData, store) {
  try {
    console.log(store)
    let orderNumberCancel = await extraerOrderNumberDesdeJson(jsonData);
    let idCustomerCancel = await consultarIdCustomer(store);
    console.log(orderNumberCancel)
    console.log("idCustomerCancel ", idCustomerCancel)
    await cambiarEstadoBBDD(orderNumberCancel, idCustomerCancel);
  } catch (error) {
    logger.error('Error al procesar el webhook de orders:', error);
    throw error;
  }
}

async function cambiarEstadoBBDD(orderNumberCancel, idCustomerCancel) {
  let finalizado = "false";
  try {
    const pool = await connectToDatabase(1);

    // Consulta para obtener el estado actual de St_DeliverynoteHeader
    const queryEstadoActual = `
      SELECT St_DeliverynoteHeader
      FROM DeliveryNoteHeader
      WHERE IdOrder = (
          SELECT IdOrder
          FROM OrderHeader
          WHERE OrderNumber = @orderNumberCancel AND IdCustomer = @idCustomerCancel
      );
    `;
    const requestEstadoActual = pool.request();
    requestEstadoActual.input('orderNumberCancel', sql.NVarChar, orderNumberCancel.toString()); 
    requestEstadoActual.input('idCustomerCancel', sql.Int, idCustomerCancel); 
    const resultEstadoActual = await requestEstadoActual.query(queryEstadoActual);

    if (resultEstadoActual.recordset.length === 0) {
      console.log('No se encontró el orderNumberCancel en la tabla OrderHeader.');
      return;
    }

    if (resultConsultaIdOrder.recordset.length > 1) {
      await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado);
      throw new Error('Hay múltiples IdOrder.');
    }

    const estadoActual = resultEstadoActual.recordset[0].St_DeliverynoteHeader;

    // Verificar si el estado es 'FIN' y enviar un correo electrónico si es así
    if (estadoActual === 'FIN') {
      finalizado = "true";
      await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado);
    }

    // Consulta para actualizar el estado a 'DEL' en la base de datos
    const queryActualizarEstado = `
      UPDATE DeliveryNoteHeader
      SET St_DeliverynoteHeader = 'DEL'
      WHERE IdOrder = (
          SELECT IdOrder
          FROM OrderHeader
          WHERE OrderNumber = @orderNumberCancel AND IdCustomer = @idCustomerCancel
      );
    `;
    const requestActualizarEstado = pool.request();
    requestActualizarEstado.input('orderNumberCancel', sql.NVarChar, orderNumberCancel.toString()); 
    requestActualizarEstado.input('idCustomerCancel', sql.Int, idCustomerCancel); 
    await requestActualizarEstado.query(queryActualizarEstado);
    finalizado = "correcto";
    await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado);
    console.log(`Se ha actualizado el estado del pedido a 'DEL' para el OrderNumber ${orderNumberCancel}.`);
  } catch (error) {
    if (error.message.includes('deadlocked')) {
      console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
      // Esperar un breve intervalo antes de reintentar la operación
      await new Promise(resolve => setTimeout(resolve, 5000)); 
      const pool = await connectToDatabase(1);
      await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado)
      // Consulta para obtener el estado actual de St_DeliverynoteHeader
      const queryEstadoActual = `
        SELECT St_DeliverynoteHeader
        FROM DeliveryNoteHeader
        WHERE IdOrder = (
            SELECT IdOrder
            FROM OrderHeader
            WHERE OrderNumber = @orderNumberCancel AND IdCustomer = @idCustomerCancel
        );
      `;
      const requestEstadoActual = pool.request();
      requestEstadoActual.input('orderNumberCancel', sql.NVarChar, orderNumberCancel.toString()); 
      requestEstadoActual.input('idCustomerCancel', sql.Int, idCustomerCancel); 
      const resultEstadoActual = await requestEstadoActual.query(queryEstadoActual);

      if (resultEstadoActual.recordset.length === 0) {
        console.log('No se encontró el orderNumberCancel en la tabla OrderHeader.');
        return;
      }

      if (resultConsultaIdOrder.recordset.length > 1) {
        await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado);
        throw new Error('Hay múltiples IdOrder.');
      }

      const estadoActual = resultEstadoActual.recordset[0].St_DeliverynoteHeader;

      // Verificar si el estado es 'FIN' y enviar un correo electrónico si es así
      if (estadoActual === 'FIN') {
        finalizado = "true";
        await enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado);
      }

      // Consulta para actualizar el estado a 'DEL' en la base de datos
      const queryActualizarEstado = `
        UPDATE DeliveryNoteHeader
        SET St_DeliverynoteHeader = 'DEL'
        WHERE IdOrder = (
            SELECT IdOrder
            FROM OrderHeader
            WHERE OrderNumber = @orderNumberCancel AND IdCustomer = @idCustomerCancel
        );
      `;
      const requestActualizarEstado = pool.request();
      requestActualizarEstado.input('orderNumberCancel', sql.NVarChar, orderNumberCancel.toString()); 
      requestActualizarEstado.input('idCustomerCancel', sql.Int, idCustomerCancel); 
      await requestActualizarEstado.query(queryActualizarEstado);

      console.log(`Se ha actualizado el estado del pedido a 'DEL' para el OrderNumber ${orderNumberCancel}.`);
    } else {
      console.error('Error al actualizar el estado en la base de datos:', error.message);
    }
  }
}


async function extraerOrderNumberDesdeJson(jsonData) {
  try {
    // Extraer el order number del JSON recibido
    const orderNumber = jsonData.order_number;
    // Devolver el order number
    return orderNumber;
  } catch (error) {
    console.error('Error al extraer el order number:', error);
    return null;
  }
}


async function consultarIdCustomer(store) {
  try {
    const pool2 = await connectToDatabase2(2);
    const request = pool2.request();

    const result = await request.input('NombreEndpoint', sql.NVarChar, store)
      .query('SELECT IdCustomer FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
    
    const idCustomer = result.recordset[0]?.IdCustomer;
    console.log("idCustomer: ", idCustomer)
    return idCustomer;
  } catch (error) {
    logger.error('Error al obtener el idCustomer:', error);
    throw error;
  }
}


async function enviarCorreoIncidencia(orderNumberCancel, idCustomerCancel, finalizado) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'mail.disnet.es',
      port: 25,
      secure: false,
      ignoreTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    let subject = '';
    let text = '';

    if (finalizado == "true") {
      subject = `Error al cancelar un pedido de shopify`;
      text = `No se ha podido cancelar el pedido ${orderNumberCancel} para el cliente ${idCustomerCancel} porque el albaran ya tiene el estado FIN`;
    } else if(finalizado == "false"){
      subject = `Error al cancelar un pedido de shopify`;
      text = `No se ha podido cancelar el pedido ${orderNumberCancel} para el cliente ${idCustomerCancel} automaticamente, requiere accion manual.`;
    } else if(finalizado == "correcto"){
      subject = `Se ha cancelado el pedido de shopify`;
      text = `Se ha cancelado el pedido ${orderNumberCancel} para el cliente ${idCustomerCancel} automaticamente. Hay que revisar si el stock es correcto.`;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_2,
      subject: subject,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo electrónico enviado:', info.response);
  } catch (error) {
    console.log('Error en enviarCorreoIncidencia:', error);
  }
}



  


//Exporta los modulos
module.exports = { initWebhooks, handleWebhook, handleOrderWebhook, sendOrderToWebService, getUnfulfilledOrdersAndSendToWebService };