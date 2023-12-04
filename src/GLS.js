const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const fs = require('fs');
const childProcess = require('child_process');

// Middleware para manejar las solicitudes GLS
const glsMiddleware = (function () {
  const router = express.Router();

  // Middleware para manejar la consulta de etiquetas
  //Esta es la url en la que cuando alguien entre se ejecuta el codigo en su interior, es decir un disparador de evento
  // Hay que valorar si queremos esto o algo mas automatico
  router.post('/gls/consultarEtiqueta', async (req, res) => {
    try {
      const { codigo, formatoEtiqueta } = req.body;

      // Construir la solicitud SOAP
      const soapRequest = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <Etiqueta xmlns="http://dirmensajeria.com/">
              <codigo>${codigo}</codigo>
              <formatoEtiqueta>${formatoEtiqueta}</formatoEtiqueta>
            </Etiqueta>
          </soap:Body>
        </soap:Envelope>`;

      // Configurar la solicitud SOAP
      const response = await axios.post('https://ws.dirmensajeria.com:3033/dir.asmx?op=Etiqueta', soapRequest, {
        headers: { 'Content-Type': 'text/xml' },
      });

      // Analizar la respuesta SOAP para extraer la etiqueta base64Binary
      const result = await xml2js.parseStringPromise(response.data);
      const base64Binary = result['soap:Envelope']['soap:Body'][0]['EtiquetaResponse'][0]['EtiquetaResult'][0]['etiqueta'][0]['base64Binary'][0];

      // Guardar la etiqueta en un archivo
      const fileName = 'etiqueta.gls';
      fs.writeFileSync(fileName, Buffer.from(base64Binary, 'base64'));

      // Ejecutar el comando para imprimir el archivo
      const printCommand = `lp ${fileName}`;
      childProcess.execSync(printCommand);

      // Enviar una respuesta exitosa
      res.status(200).send('Etiqueta generada y enviada a imprimir');
    } catch (error) {
      console.error('Error al consultar etiqueta en GLS:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
})();

module.exports = { glsMiddleware };
