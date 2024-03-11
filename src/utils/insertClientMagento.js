// insertClientMagento.js
const {pool,  sql, connectToDatabase2 } = require('../utils/database');

async function insertIntoDB(nombreEndpoint, urlTienda, urlWebservice, apiKey, consumerKey, consumerSecret, accessToken, accessTokenSecret, idCustomer, sessionCode, transportCompany) {
  try {
    const pool = await connectToDatabase2();
    const request = pool.request();
    const query = `
    INSERT INTO MiddlewareMagento (NombreEndpoint, UrlTienda, urlWebservice, ApiKey, ConsumerKey, ConsumerSecret, AccessToken, AccessTokenSecret, IdCustomer, SessionCode, TransportCompany)
    VALUES (@nombreEndpoint, @urlTienda, @urlWebservice, @apiKey, @consumerKey, @consumerSecret, @accessToken, @accessTokenSecret, @idCustomer, @sessionCode, @transportCompany)
    `;
    await request
      .input('nombreEndpoint', sql.NVarChar, nombreEndpoint)
      .input('UrlTienda', sql.NVarChar, urlTienda)
      .input('UrlWebservice', sql.NVarChar, urlWebservice)
      .input('apiKey', sql.NVarChar, apiKey)
      .input('consumerKey', sql.NVarChar, consumerKey)
      .input('consumerSecret', sql.NVarChar, consumerSecret)
      .input('accessToken', sql.NVarChar, accessToken)
      .input('accessTokenSecret', sql.NVarChar, accessTokenSecret)
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

async function updateClientInDB(clientId, nombreEndpoint, urlTienda, urlWebservice, idCustomer, sessionCode, transportCompany) {
  try {
    const pool = await connectToDatabase2();
    const request = pool.request();
    const query = `
      UPDATE MiddlewareMagento 
      SET NombreEndpoint = @nombreEndpoint, 
          UrlTienda = @urlTienda,
          UrlWebservice = @urlWebservice,
          IdCustomer = @idCustomer, 
          SessionCode = @sessionCode, 
          TransportCompany = @transportCompany
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('nombreEndpoint', sql.NVarChar, nombreEndpoint)
      .input('urlTienda', sql.NVarChar, urlTienda)
      .input('urlWebservice', sql.NVarChar, urlWebservice)
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
    const pool = await connectToDatabase2();
    const request = pool.request();
    const query = `
      DELETE FROM MiddlewareMagento
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