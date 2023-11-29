//Utilizo express como middleware para manejar los eventos http
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000; //Puerto donde escucha

app.use(bodyParser.raw({ type: 'application/xml' }));
app.use(cors()); // Habilita CORS para todas las rutas, sirve para poder recibir desde fuera de nuestra red

//Implementar Funcionalidad,
//Hacer que compruebe mas de un endpoint, de mas de una empresa o cliente.
/* Idea de momento:

    Añadir una array con el nombre de clientes que utilizen el webhook de shopify, pero cada vez que se añada un nuevo cliente se tendria que modificar el array
    ¿Podria sobrecargar el servidor? al hacer el bucle que compruebe todos los clientes

    Otra opcion seria tambien con el mismo array rellenar las urls y que con una funcion que maneje las urls haga las consultas y haga el post
    atraves de esta funcion y no directamente de la url. Esta opcion seria mas practica, pero tengo que comprobar si es posible

    Tambien hay que pensar un metodo para cambiar la url del post al webservice, ya que en cada cliente tendra un endpoint diferente
    Para esto tambien existe la posibilidad de hacer otro array con estos endpoints ya que su formato es el siguiente:
    http://webservice.disnet.es:30000/{11TestPedidos}/
    En el caso de Print a lot seria http://webservice.disnet.es:30000/15PRTPedidos/
    (o algo asi no es seguro)


    Para que funcione todo esto es necessario que al configurar el webhook el url sea de la siguiente manera:
    https://disnet.es/{nombrecliente}/webhook/{servicio_requerido(pedidos)}/

    No se si lo alojaremos en disnet.es o en alguno de disnet como del b2b o del erp

    Para comprobar los datos una posible solucion seria crear un archivo xml con la plantilla, algo asi:
    <!-- schemas/session-info.xsd -->
    <xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="sessionInfo">
        <xs:complexType>
        <xs:sequence>
            <xs:element type="xs:int" name="customerId"/>
            <xs:element type="xs:string" name="customerName"/>
            <xs:element type="xs:string" name="token"/>
        </xs:sequence>
        <xs:attribute type="xs:long" name="id"/>
        </xs:complexType>
    </xs:element>
    </xs:schema>
*/  


// Middleware para manejar los webhooks de Shopify - Pedido
app.post('/nombrecliente/webhook/pedidos', (req, res) => {
  const data = req.body.toString('utf8');

  if (verificarDatos(data)) {
    enviarDatosAlWebService(data)
      .then(response => {
        console.log('Respuesta del servicio web:', response.data);
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('Error al enviar datos al servicio web:', error);
        res.status(500).send('Error interno del servidor');
      });
  } else {
    console.error('Datos incorrectos');
    res.status(400).send('Datos incorrectos');
  }
});



// Middleware para manejar los webhooks de Shopify - Actualización de Pedidos
app.post('/nombrecliente/webhook/actualizacion_pedidos', (req, res) => {
  const data = req.body.toString('utf8');

  if (verificarDatos(data)) {
    enviarDatosAlWebService(data)
      .then(response => {
        console.log('Respuesta del servicio web:', response.data);
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('Error al enviar datos al servicio web:', error);
        res.status(500).send('Error interno del servidor');
      });
  } else {
    console.error('Datos incorrectos');
    res.status(400).send('Datos incorrectos');
  }
});

// Función para verificar los datos sean correctos y añadir algun cambio para que lo sean.
function verificarDatos(data) {
  //Falta añadir la funcion para verificarlos


  return true;
}

// Función para enviar datos al servicio web
function enviarDatosAlWebService(data) {
  // Añadir la url de nuestro webservice en la constante de abajo
  const urlWebService = 'http://webservice.disnet.es:30000/';
  return axios.post(urlWebService, { data });
}

//Disparador de evento cuando alguien haga una solicitud se ejecutara el codigo que queramos
//Middleware escuchando en el puerto que hemos definido arriba (normalmente el 3000)
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

