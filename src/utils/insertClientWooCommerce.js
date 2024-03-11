// insertClientWooCommerce.js
const { pool2, sql2, connectToDatabase2 } = require('../utils/database');

async function insertIntoDB(nombreEndpoint, urlWebService, apiKey, apiSecret, idCustomer, sessionCode, transportCompany) {
  try {
    const pool2 = await connectToDatabase();
    const request = pool.request();
    const query = `
    INSERT INTO MiddlewareWooCommerce (NombreEndpoint, UrlWebService, ApiKey, ApiSecret, IdCustomer, SessionCode, TransportCompany)
    VALUES (@nombreEndpoint, @urlWebService, @apiKey, @apiSecret, @idCustomer, @sessionCode, @transportCompany)
    `;
    await request
      .input('nombreEndpoint', sql2.NVarChar, nombreEndpoint)
      .input('urlWebService', sql2.NVarChar, urlWebService)
      .input('apiKey', sql2.NVarChar, apiKey)
      .input('apiSecret', sql2.NVarChar, apiSecret)
      .input('idCustomer', sql2.Int, idCustomer)
      .input('sessionCode', sql2.NVarChar, sessionCode)
      .input('transportCompany', sql2.NVarChar, transportCompany)
      .query(query);
    console.log('Datos insertados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al insertar en la base de datos:', error);
    throw error;
  }
}

async function updateClientInDB(clientId, nombreEndpoint, urlWebService, idCustomer, sessionCode, transportCompany) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
      UPDATE MiddlewareWooCommerce 
      SET NombreEndpoint = @nombreEndpoint, 
          UrlWebService = @urlWebService, 
          IdCustomer = @idCustomer, 
          SessionCode = @sessionCode, 
          TransportCompany = @transportCompany
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('nombreEndpoint', sql2.NVarChar, nombreEndpoint)
      .input('urlWebService', sql2.NVarChar, urlWebService)
      .input('idCustomer', sql2.NVarChar, idCustomer)
      .input('sessionCode', sql2.NVarChar, sessionCode)
      .input('transportCompany', sql2.NVarChar, transportCompany)
      .input('clientId', sql2.Int, clientId)
      .query(query);
    console.log('Datos actualizados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al actualizar en la base de datos:', error);
    throw error;
  }
}


async function deleteClientFromDB(clientId) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
      DELETE FROM MiddlewareWooCommerce
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('clientId', sql.Int, clientId)
      .query(query);
    console.log('Cliente eliminado correctamente de la base de datos.');
  } catch (error) {
    console.error('Error al eliminar de la base de datos:', error);
    throw error;
  }
}




module.exports = { insertIntoDB, updateClientInDB, deleteClientFromDB };