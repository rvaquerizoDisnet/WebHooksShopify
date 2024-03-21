// Importar el módulo http de Node.js
const http = require('http');
// Importar ngrok
const ngrok = require('ngrok');

// Definir el puerto en el que el servidor escuchará las solicitudes
const PORT = 3000;

// Crear una función de callback que manejará las solicitudes entrantes
const requestHandler = (request, response) => {
  // Verificar si la URL es "/" (localhost/)
  if (request.url === '/') {
    // Configurar encabezados de respuesta
    response.setHeader('Content-Type', 'text/plain');
    response.statusCode = 200;

    // Imprimir por pantalla la información de la solicitud
    console.log(`Solicitud recibida en ${new Date()}:`);
    console.log(`Método: ${request.method}`);
    console.log(`URL: ${request.url}`);
    console.log(`Encabezados:`, request.headers);
    // El cuerpo de la solicitud no estará disponible en este caso, ya que es una solicitud GET sin cuerpo

    // Enviar una respuesta al cliente
    response.end('¡Solicitud recibida!\n');
  } else {
    // Si la URL no es "/", devolver un error 404 (Not Found)
    response.statusCode = 404;
    response.end('Error 404: Not Found\n');
  }
};

// Crear el servidor pasando la función de callback como argumento
const server = http.createServer(requestHandler);

// Iniciar el servidor y hacerlo escuchar en el puerto especificado
server.listen(PORT, async (err) => {
  if (err) {
    return console.error('Error al iniciar el servidor:', err);
  }
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  try {
    // Iniciar Ngrok y obtener la URL pública
    const url = await ngrok.connect(PORT);
    console.log(`Servidor expuesto a través de ${url}`);
  } catch (error) {
    console.error('Error al iniciar Ngrok:', error);
  }
});
