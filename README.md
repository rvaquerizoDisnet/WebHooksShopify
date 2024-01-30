# Documentación Middleware de Shopify

 
Introducción
Este middleware es una aplicación que se encarga de hacer de intermediario entre ABC y las demás aplicaciones online con las que trabajamos, en este caso Shopify y GLS.

Instalación 
A continuación, se detallan los pasos para instalar y configurar la aplicación en un servidor.
Requisitos Previos
•	Node.js instalado en el servidor.
•	Si no esta instalado se puede descargar aquí: https://nodejs.org/en
•	Versión 20.10.0
•	Una cuenta de ngrok para obtener una URL pública (En el caso de utilizar un servidor propio no haría falta).
Pasos de Instalación
1.	Descargar el Código Fuente
Descargue o clone el código fuente desde el repositorio. https://github.com/rvaquerizoDisnet/WebHooksShopify
2.	Instalar Dependencias
Abra una terminal en el directorio de la aplicación y ejecute el siguiente comando para instalar las dependencias:
npm install 
3.	Configurar Variables de Entorno
Cree un archivo .env en el directorio raíz de la aplicación y configure las variables de entorno, las variables de entrono serán la URL del servidor, las API Keys de las tiendas de Shopify…
4.	Configurar ngrok (No será necesario si utilizamos el servidor propio) (Solo para trabajar en local en un entorno de prueba)
Regístrese en ngrok y obtenga su clave de autenticación. Luego, ejecute el siguiente comando en la terminal:
ngrok authtoken YOUR_AUTH_TOKEN 
5.	Iniciar la Aplicación
Ejecute la aplicación con el siguiente comando:
Necesitas estar en el directorio del proyecto y dentro de /src/
node index.js 
La aplicación se iniciará en el puerto especificado en el archivo .env.
Configuración del Webhook en Shopify
1.	Inicie sesión en su cuenta de Shopify.
2.	Vaya a Settings > Notifications.
3.	Desplácese hacia abajo hasta la sección de Webhooks.
4.	Haga clic en el botón Create a webhook.
5.	Complete la URL del webhook con la URL pública generada por ngrok (o el dominio personalizado) seguido de /shopify /printalot/orders/ (o la ruta especificada en api.js).
6.	Seleccione los eventos de webhook deseados (por ejemplo, "Order payment").
7.	Seleccione la versión deseada, normalmente la lastest.
8.	Haga clic en Save webhook.
Con estos pasos, la aplicación estará configurada y lista para recibir y procesar los webhooks de Shopify.
Configuración del Admin API en Shopify
1.	Inicie sesión en su cuenta de Shopify.
2.	Vaya a Settings > Apps.
3.	Clique en Develop apps
4.	Cree una app.
5.	Configurar los Admin API Access scopes, selecciona los scopes necesarios, adjunto captura con un ejemplo:
 
6.	Guarda las credenciales 

Funcionamiento
•	Shopify hace un post al endpoint especificado en nuestra API y dispara las funciones para manejar el pedido.
•	La aplicación procesa solicitudes POST de Shopify y las envía a un webservice externo después de convertirlas a formato XML.
•	Se implementa un sistema de reintentos en caso de fallos, con un máximo de 10 intentos y un intervalo de 10 minutos entre intentos.
•	Si han fallado todos los intentos se envía un correo electrónico a un administrador para solucionar el error manualmente.
•	Los errores se registran en archivos de registro en el servidor.

Es fundamental monitorear los registros y solucionar cualquier problema que pueda surgir durante el procesamiento de los pedidos. Además, asegúrese de mantener actualizadas las configuraciones de seguridad, como las claves de ngrok y las variables de entorno.

Estructura del código
1. api.js
Este archivo define la API y los endpoints que recibirán las solicitudes de Shopify. A continuación, se describen los elementos clave:
•	Endpoints GET y POST: Define dos endpoints (GET y POST) en la ruta /shopify /printalot/orders/ .La solicitud GET simplemente imprime un mensaje en la consola, mientras que la solicitud POST maneja los webhooks de Shopify.
•	Llamada a handleWebhook: Cuando se recibe una solicitud POST, se invoca la función handleWebhook del módulo shopify.js, que se encargará de procesar y enviar los datos al webservice externo.
•	Endpoint POST /shopify/shipments/ : Este endpoint recibe un XML normalmente atraves de ABC, anteriormente hemos configurado un webservice que envia estos datos cuando una tarea automática de Albaran expedido se dispara.
•	Endpoint GET /printalot/orders/unfulfilled/: Este endpoint lo que hace es coger los pedidos de la tienda, que tengan el estado unfulfilled y los añade a ABC, hay que tener cuidado ya que puede haber pedidos que ya existan en ABC, pero aun siguen teniendo el estado de unfulfilled. Este endpoint hace una llamada al método getUnfulfilledOrdersAndSendToWebService que utiliza la Admin API de shopify, que explicaré a mas adelante.

2. shopify.js
Este archivo contiene la lógica principal para el manejo de webhooks y el procesamiento de datos. Aquí tienes una descripción más detallada:
•	Configuración de Logger: Se utiliza el módulo winston para la configuración del sistema de registro, con archivos de registro separados para errores y registros combinados.
•	Configuración de Cola y Reintentos: Se implementa una cola de trabajo (queue) para gestionar los reintentos en caso de errores. Los trabajos se reintentan hasta 10 veces, con un intervalo de 10 minutos entre intentos.
•	Envío de Correos Electrónicos: En caso de fallo persistente, se envía un correo electrónico al administrador para su intervención manual.
•	Iniciación de Webhooks: La función initWebhooks se encarga de establecer los endpoints en la aplicación Express. También se inicia un intervalo para procesar la cola en segundo plano.
•	Función Principal handleWebhook: Esta función maneja la lógica principal del procesamiento de webhooks. Convierte los datos JSON a XML, y luego envía los datos al webservice externo alojado en ABC utilizando la función de enviarDatosAlWebservice.
•	Funcion getUnfulfilledOrdersAndSendToWebService(): Lo que hace esta funcion es hacer una consulta a la API de shopify (no la nuestra), y hace lo mismo que handlewebhook, lo mapea a xml y lo envia al webservice.
3. shopifyAPI.js:
Este archivo solo tiene una función handleShipmentAdminApi, esta función sirve para poder cambiarle el estado a los pedidos a la tienda de shopify, basicamente lo que hace es recibir un XML de ABC con estos datos:
XML de ejemplo:
<Pedidos>
  <Pedido>
    <IdOrder>142155</IdOrder>
    <OrderNumber>#1817</OrderNumber>
    <IdCustomer>15</IdCustomer>
    <TrackingNumber>617261648510680054</TrackingNumber>
  </Pedido>
</Pedidos>
Y con estos datos lo que hacemos es hacer una búsqueda del OrderNumber en la API de Shopify y extraemos su OrderId, porque el OrderId que recibimos es uno interno de ABC no es el mismo que el de Shopify. Tambien comprobamos si ya tienen una location_id assignada, esto quiere decir que ya están fulfilleds, y entonces no hacemos ningún tratamiento con estos datos. Si en cambio no lo tienen, lo que hacemos es crear un fulfillment y updatearlo con los datos que hemos recibido y otros que son fijos.
Aquí te dejo un flujo de datos:
1. Obtiene los datos XML de la solicitud a través del cuerpo de la solicitud ( req.body ). 
2. Valida que los datos XML contengan una lista de pedidos. 
3. Configura el acceso a la API de administración de Shopify utilizando las credenciales proporcionadas. 
4. Itera sobre cada pedido en la lista de pedidos. 
5. Valida que el pedido contenga un número de orden y un número de seguimiento. 
6. Obtiene la lista de pedidos de la tienda de Shopify que coinciden con el número de orden. 
7. Valida que el pedido exista en la tienda de Shopify. 
8. Obtiene el ID del pedido y el ID de ubicación del cumplimiento.
9. Si el pedido ya tiene un ID de ubicación asignado, no se realiza ninguna acción adicional. 
10. Obtiene los detalles del cumplimiento del pedido. 
11. Crea un objeto de parámetros de actualización para el pedido, que incluye los detalles del cumplimiento y la información de seguimiento. 
12. Crea la actualización de cumplimiento para el pedido. 
13. Maneja cualquier error que ocurra durante el proceso y envía una respuesta de error si es necesario. 
14. Envía una respuesta exitosa si no se ha enviado ninguna respuesta anteriormente.


3. index.js
Este archivo es el punto de entrada de la aplicación y realiza las siguientes acciones:
Este código configura un servidor Express que escucha en un puerto específico y maneja diferentes rutas para la API y otras funcionalidades.
Dependencias utilizadas 
- express : Framework web de Node.js que facilita la creación de aplicaciones web. 
- body-parser : Middleware para analizar los cuerpos de las solicitudes HTTP. 
- express-xml-bodyparser : Middleware para analizar cuerpos de solicitud XML en Express. 
- cors : Middleware para habilitar CORS (Cross-Origin Resource Sharing) en Express. 
Configuración del servidor 
El código establece el servidor Express y define el puerto en el que escuchará las solicitudes. Si no se especifica un puerto a través de la variable de entorno PORT, el servidor utilizará el puerto 3001 de forma predeterminada.
Montamos la Api en unas rutas, luego iniciamos los webhooks y el servidor se queda escuchando a espera de eventos.

En resumen, la aplicación actúa como un intermediario entre los webhooks de Shopify y un webservice externo. Los webhooks son procesados y se implementa un sistema de reintentos en caso de fallos, con registros detallados y notificaciones por correo electrónico para intervención manual en caso necesario. La aplicación utiliza ngrok para proporcionar una URL pública y es fácilmente escalable para gestionar webhooks de varias tiendas.

Documentacion técnica
index.js
Este archivo es el punto de entrada de la aplicación y configura el servidor principal.
Variables
- `express`: Módulo de Express para crear aplicaciones web.
- `bodyParser`: Módulo para analizar solicitudes HTTP con cuerpos JSON o URL-encoded.
- `connectToDatabase`: Función para conectarse a la base de datos.
- `apiRouter`: Enrutador para la API principal.
- `glsRouter`: Enrutador para la API de GLS.
- `usersRouter`: Enrutador para la API de usuarios.
- `homeRouter`: Enrutador para la página de inicio.
- `shopify`: Módulo para interactuar con la API de Shopify.
- `errorHandlingMiddleware`: Middleware para manejar errores.
- `dotenv`: Módulo para cargar variables de entorno desde un archivo `.env`.
- `cors`: Módulo para habilitar CORS (Cross-Origin Resource Sharing).
- `app`: Instancia de la aplicación Express.
- `port`: Número de puerto en el que se ejecutará el servidor.

Funciones
- `connectToDatabase`: Se conecta a la base de datos utilizando los valores de las variables de entorno.
- `shopify.initWebhooks`: Inicializa los webhooks de Shopify con la URL pública proporcionada.
Rutas
- `/shopify`: Ruta para la API principal.
- `/gls`: Ruta para la API de GLS.
- `/users`: Ruta para la API de usuarios.
- `/`: Ruta para la página de inicio.
Middleware
- `bodyParser.json()`: Analiza las solicitudes HTTP con cuerpos JSON.
- `bodyParser.urlencoded({ extended: true })`: Analiza las solicitudes HTTP con cuerpos URL-encoded.
- `errorHandlingMiddleware`: Maneja los errores y devuelve una respuesta adecuada al cliente.
Servidor
- `app.listen(port, () => {})`: Inicia el servidor principal en el puerto especificado.
- `process.on('SIGTERM', () => {})`: Maneja el evento SIGTERM para cerrar correctamente el servidor.
Conclusión
Este archivo configura el servidor principal, se conecta a la base de datos, inicializa los webhooks de Shopify y configura las rutas y el middleware.

api.js
Este archivo define las rutas para la API principal.
Variables
- `express`: Módulo de Express para crear aplicaciones web.
- `bodyParser`: Módulo para analizar solicitudes HTTP con cuerpos JSON o URL-encoded.
- `router`: Instancia del enrutador de Express.
- `shopify`: Módulo para interactuar con la API de Shopify.
- `shopifyAPI`: Módulo para interactuar con la API de Shopify Admin.
- `xmlparser`: Módulo para analizar solicitudes HTTP con cuerpos XML.
- `protegerRuta`: Función para proteger una ruta con autenticación.
- `util`: Módulo para utilidades generales.

Rutas
- `/printalot/orders/`: Ruta para obtener todos los pedidos de Printalot.
- `/printalot/orders/unfulfilled/`: Ruta para obtener todos los pedidos no cumplidos de Printalot.
- `/shipments/`: Ruta para modificar los envíos de Shopify.
Funciones
- `obtenerCodigoSesionCliente`: Función para obtener el código de sesión del cliente a partir del cuerpo de la solicitud.
Exportaciones
- `router`: Instancia del enrutador de Express.
Conclusión
Este archivo define las rutas para la API principal, incluyendo la obtención de pedidos de Printalot, la obtención de pedidos no cumplidos de Printalot y la modificación de envíos de Shopify. 
Shopify.js
Variables
- `crypto`: Módulo para funciones de criptografía.
- `xml2js`: Módulo para convertir XML a JSON y viceversa.
- `axios`: Módulo para realizar solicitudes HTTP.
- `nodemailer`: Módulo para enviar correos electrónicos.
- `winston`: Módulo para el registro de registros.
- `path`: Módulo para trabajar con rutas de archivos.
- `logger`: Instancia del registrador de registros de Winston.
- `queue`: Cola para almacenar trabajos pendientes.
- `maxRetries`: Número máximo de reintentos para un trabajo.
- `retryInterval`: Intervalo de tiempo entre reintentos en milisegundos.
Funciones
- `handleRetry`: Función para manejar el reintentar un trabajo después de un intervalo de tiempo.
- `sendErrorEmail`: Función para enviar un correo electrónico de error.
- `processQueue`: Función para procesar la cola de trabajos.
- `addToQueue`: Función para agregar un trabajo a la cola.
- `initWebhooks`: Función para inicializar los webhooks en la aplicación Express.
- `handleWebhook`: Función para manejar un webhook.
- `handleOrderWebhook`: Función para manejar un webhook de orden.
- `enviarDatosAlWebService`: Función para enviar datos a un servicio web.
- `convertirJSToXML`: Función para convertir datos JSON a XML.
- `mapJsonToXml`: Función para mapear datos JSON a XML.
- `obtenerCodigoSesionCliente`: Función para obtener el código de sesión del cliente.
- `sendOrderToWebService`: Función para enviar una orden a un servicio web.
- `getUnfulfilledOrdersAndSendToWebService`: Función para obtener pedidos no cumplidos y enviarlos a un servicio web.
Exportaciones
- `initWebhooks`: Función para inicializar los webhooks en la aplicación Express.
- `handleWebhook`: Función para manejar un webhook.
- `handleOrderWebhook`: Función para manejar un webhook de orden.
- `sendOrderToWebService`: Función para enviar una orden a un servicio web.
- `getUnfulfilledOrdersAndSendToWebService`: Función para obtener pedidos no cumplidos y enviarlos a un servicio web.
Conclusión
Este archivo contiene varias funciones y configuraciones relacionadas con el manejo de webhooks, el envío de datos a servicios web y el procesamiento de la cola de trabajos. También exporta las funciones necesarias para inicializar los webhooks y manejar los webhooks de orden.

ShopifyAPI.js:
Este archivo define una función `handleShipmentAdminApi` que se encarga de manejar una solicitud a la API de administración de Shopify para el envío de pedidos.
Variables
- `Shopify`: Módulo para interactuar con la API de Shopify.
- `adminApiAccessToken`: Token de acceso para la API de administración de Shopify.
- `shopify`: Instancia de la API de Shopify.
Funciones
- `handleShipmentAdminApi`: Función principal que maneja la solicitud de envío de pedidos a través de la API de administración de Shopify. Realiza las siguientes acciones:
  - Obtiene los datos XML de la solicitud.
  - Valida los datos XML y verifica la existencia de los campos necesarios.
  - Obtiene el token de acceso para la API de administración de Shopify.
  - Itera sobre los pedidos en los datos XML y realiza las siguientes acciones para cada pedido:
    - Verifica la existencia de los campos `ordernumber` y `trackingnumber`.
    - Busca el pedido en la tienda de Shopify utilizando el número de pedido.
    - Obtiene la dirección de envío y el código postal del pedido.
    - Verifica la existencia del pedido en la tienda de Shopify.
    - Guarda el ID del pedido y el ID de ubicación (si existe).
    - Si el pedido ya tiene un ID de ubicación, no realiza ninguna acción adicional.
    - Obtiene los detalles del cumplimiento del pedido.
    - Crea un objeto de actualización con los detalles del cumplimiento, el número de seguimiento y la URL de seguimiento.
    - Crea la actualización de cumplimiento en Shopify.
  - Maneja los errores y envía la respuesta adecuada al cliente.
Exportaciones

- `handleShipmentAdminApi`: Función que maneja la solicitud de envío de pedidos a través de la API de administración de Shopify.
Conclusión
Este archivo contiene una función que maneja la solicitud de envío de pedidos a través de la API de administración de Shopify. Realiza la validación de los datos, busca los pedidos en la tienda de Shopify y crea las actualizaciones de cumplimiento correspondientes.
