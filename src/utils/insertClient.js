// insertClient.js
const { pool, sql, connectToDatabase } = require('../utils/database');

async function insertIntoDB(nombreEndpoint, urlWebService, apiKey, apiSecret, accessToken, idCustomer, sessionCode, transportCompany) {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    const query = `
    INSERT INTO MiddlewareShopify (NombreEndpoint, UrlWebService, ApiKey, ApiSecret, AccessToken, IdCustomer, SessionCode, TransportCompany)
    VALUES (@nombreEndpoint, @urlWebService, @apiKey, @apiSecret, @accessToken, @idCustomer, @sessionCode, @transportCompany)
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('nombreEndpoint', sql.NVarChar, nombreEndpoint)
      .input('urlWebService', sql.NVarChar, urlWebService)
      .input('apiKey', sql.NVarChar, apiKey)
      .input('apiSecret', sql.NVarChar, apiSecret)
      .input('accessToken', sql.NVarChar, accessToken)
      .input('idCustomer', sql.Int, idCustomer)
      .input('sessionCode', sql.NVarChar, sessionCode)
      .input('transportCompany', sql.NVarChar, transportCompany)
      .query(query);
    console.log('Datos insertados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al insertar en la base de datos:', error);
    throw error;
  }
}

async function updateClientInDB(clientId, nombreEndpoint, urlWebService, idCustomer, sessionCode, transportCompany) {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    const query = `
      UPDATE MiddlewareShopify 
      SET NombreEndpoint = @nombreEndpoint, 
          UrlWebService = @urlWebService, 
          IdCustomer = @idCustomer, 
          SessionCode = @sessionCode, 
          TransportCompany = @transportCompany
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('nombreEndpoint', sql.NVarChar, nombreEndpoint)
      .input('urlWebService', sql.NVarChar, urlWebService)
      .input('idCustomer', sql.NVarChar, idCustomer)
      .input('sessionCode', sql.NVarChar, sessionCode)
      .input('transportCompany', sql.NVarChar, transportCompany)
      .input('clientId', sql.Int, clientId)
      .query(query);
    console.log('Datos actualizados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al actualizar en la base de datos:', error);
    throw error;
  }
}


async function deleteClientFromDB(clientId) {
  try {
    const pool = await connectToDatabase();
    const request = pool.request();
    const query = `
      DELETE FROM MiddlewareShopify
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
