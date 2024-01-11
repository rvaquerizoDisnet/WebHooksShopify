// glsService.js
const glsService = {
    modifyShipment: async (shipmentData) => {
      try {
        // Lógica para modificar el albarán en GLS utilizando la información en shipmentData
        // Puedes hacer llamadas a la API de GLS o interactuar con tu sistema interno.
  
        // Ejemplo: simulación de una llamada a la API de GLS
        // const glsApiResponse = await llamadaApiGLS(shipmentData);
  
        // Puedes devolver la respuesta de la API de GLS o cualquier otra información necesaria.
        return { success: true, message: 'Shipment modified successfully' };
      } catch (error) {
        console.error('Error modifying shipment in GLS:', error);
        throw error;
      }
    },
  };
  
  // Función para generar y almacenar tracking numbers
const generarYAlmacenarTrackingNumber = async (idUserConfirmation) => {
    // Aqui deberia ir la logica para generar o selecciona el tracking number
    // de momento añadimos uno de prueba
    const trackingNumber = 'TRK123456';
  
    try {
      // Conectar a la base de datos
      await sql.connect(bbddABC);
  
      // Insertar el tracking number en la tabla correspondiente
      // Hay que cambiar la consulta para insertarlo en DeliveryNoteHeader
      await sql.query(`INSERT INTO TrackingNumbers (idUserConfirmation, TrackingNumber) VALUES ('${idUserConfirmation}', '${trackingNumber}')`);
      
      // Imprimir que se ha almacenado en la base de datos
      console.log(`Tracking number ${trackingNumber} almacenado en la base de datos.`);
    } catch (error) {
      console.error('Error al almacenar el tracking number:', error.message);
    } finally {
      // Cerrar la conexión a la base de datos
      await sql.close();
    }
  };

module.exports = glsService;
  