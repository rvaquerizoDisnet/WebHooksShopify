# WebHooksShopify

Documentación Middleware de Shopify
Contenido
Documentación Middleware de Shopify	1
Introducción	2
Instalación	2
Configuración del Webhook en Shopify	3
Funcionamiento	3
Estructura del código	4




 
Introducción
Este sistema consiste en una aplicación dividida en tres archivos principales: api.js, shopify.js, y index.js. La aplicación actúa como un middleware para gestionar solicitudes POST provenientes de un webhook de Shopify. La lógica de tratamiento de datos y el manejo de errores se encuentran en shopify.js, mientras que api.js define los endpoints donde Shopify hará un POST y utiliza la lógica proporcionada por shopify.js. El archivo index.js es el punto de entrada que inicia la aplicación y se encarga de abrir una conexión ngrok (actualmente estoy utilizando ngrok como entorno de pruebas y desarrollo, pero la intención es alojarlo en un servidor) para proporcionar una URL pública.

Instalación 
A continuación, se detallan los pasos para instalar y configurar la aplicación en un servidor.
Requisitos Previos
•	Node.js instalado en el servidor.
•	Una cuenta de ngrok para obtener una URL pública (En el caso de utilizar un servidor propio no haría falta).
Pasos de Instalación
1.	Descargar el Código Fuente
Descargue o clone el código fuente desde el repositorio. https://github.com/rvaquerizoDisnet/WebHooksShopify
2.	Instalar Dependencias
Abra una terminal en el directorio de la aplicación y ejecute el siguiente comando para instalar las dependencias:
npm install 
3.	Configurar Variables de Entorno
Cree un archivo .env en el directorio raíz de la aplicación y configure las siguientes variables de entorno:
PORT=3000 (actualmente estoy utilizando el puerto 3000, pero se puede modificar)
EMAIL_USER= “”
EMAIL_PASSWORD=””
ADMIN_EMAIL=””
4.	Configurar ngrok (No será necesario si utilizamos el servidor propio)
Regístrese en ngrok y obtenga su clave de autenticación. Luego, ejecute el siguiente comando en la terminal:
ngrok authtoken YOUR_AUTH_TOKEN 
 
5.	Iniciar la Aplicación
Ejecute la aplicación con el siguiente comando:
npm start 
La aplicación se iniciará en el puerto especificado en el archivo .env.
6.	Obtener la URL Pública
Una vez que la aplicación esté en ejecución, ngrok generará una URL pública. Copie la URL generada para usarla en la configuración del webhook de Shopify.

Configuración del Webhook en Shopify
1.	Inicie sesión en su cuenta de Shopify.
2.	Vaya a Settings > Notifications.
3.	Desplácese hacia abajo hasta la sección de Webhooks.
4.	Haga clic en el botón Create a webhook.
5.	Complete la URL del webhook con la URL pública generada por ngrok (o el dominio personalizado) seguido de /shopify-webhook/printalot/orders/ (o la ruta especificada en api.js).
6.	Seleccione los eventos de webhook deseados (por ejemplo, "Order payment").
7.	Haga clic en Save webhook.
Con estos pasos, la aplicación estará configurada y lista para recibir y procesar los webhooks de Shopify.

Funcionamiento
•	Shopify hace un post al endpoint especificado en nuestra API y dispara las funciones para manejar el pedido.
•	La aplicación procesa solicitudes POST de Shopify y las envía a un webservice externo después de convertirlas a formato XML.
•	Se implementa un sistema de reintentos en caso de fallos, con un máximo de 10 intentos y un intervalo de 10 minutos entre intentos.
•	Si han fallado todos los intentos se envía un correo electrónico a un administrador para solucionar el error manualmente.
•	Los errores se registran en archivos de registro en el servidor.

Es fundamental monitorear los registros y solucionar cualquier problema que pueda surgir durante el procesamiento de los pedidos. Además, asegúrese de mantener actualizadas las configuraciones de seguridad, como las claves de ngrok y las variables de entorno.

Estructura del código
1. api.js
Este archivo define la API de Express y los endpoints que recibirán las solicitudes de Shopify. A continuación, se describen los elementos clave:
•	Endpoints GET y POST: Define dos endpoints (GET y POST) en la ruta /shopify-webhook/printalot/orders/. En el futuro cabe la posibilidad de añadir mas endpoints para manejar los pedidos de mas tiendas online. La solicitud GET simplemente imprime un mensaje en la consola, mientras que la solicitud POST maneja los webhooks de Shopify.
•	Llamada a handleWebhook: Cuando se recibe una solicitud POST, se invoca la función handleWebhook del módulo shopify.js, que se encargará de procesar y enviar los datos al webservice externo.
2. shopify.js
Este archivo contiene la lógica principal para el manejo de webhooks y el procesamiento de datos. Aquí tienes una descripción más detallada:
•	Configuración de Logger: Se utiliza el módulo winston para la configuración del sistema de registro, con archivos de registro separados para errores y registros combinados.
•	Configuración de Cola y Reintentos: Se implementa una cola de trabajo (queue) para gestionar los reintentos en caso de errores. Los trabajos se reintentan hasta 10 veces, con un intervalo de 10 minutos entre intentos.
•	Envío de Correos Electrónicos: En caso de fallo persistente, se envía un correo electrónico al administrador para su intervención manual.
•	Iniciación de Webhooks: La función initWebhooks se encarga de establecer los endpoints en la aplicación Express. También se inicia un intervalo para procesar la cola en segundo plano.
•	Función Principal handleWebhook: Esta función maneja la lógica principal del procesamiento de webhooks. Convierte los datos JSON a XML, y luego envía los datos al webservice externo alojado en ABC utilizando la función de enviarDatosAlWebservice.
3. index.js
Este archivo es el punto de entrada de la aplicación y realiza las siguientes acciones:
•	Configuración de Express y ngrok: Inicia una instancia de Express, configura middlewares para analizar solicitudes JSON y URL codificadas, y abre una conexión ngrok para obtener una URL pública.
•	Montaje de API y Webhooks: Monta la API en la ruta principal, inicia los endpoints definidos en api.js, y luego inicia los webhooks utilizando la URL pública generada por ngrok.
En resumen, la aplicación actúa como un intermediario entre los webhooks de Shopify y un webservice externo. Los webhooks son procesados y se implementa un sistema de reintentos en caso de fallos, con registros detallados y notificaciones por correo electrónico para intervención manual en caso necesario. La aplicación utiliza ngrok para proporcionar una URL pública y es fácilmente escalable para gestionar webhooks de varias tiendas.


