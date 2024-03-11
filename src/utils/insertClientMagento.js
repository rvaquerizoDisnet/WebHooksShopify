// insertClientMagento.js
const {pool2,  sql2, connectToDatabase2 } = require('../utils/database');

async function insertIntoDB(nombreEndpoint, urlTienda, urlWebservice, apiKey, consumerKey, consumerSecret, accessToken, accessTokenSecret, idCustomer, sessionCode, transportCompany) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
    INSERT INTO MiddlewareMagento (NombreEndpoint, UrlTienda, urlWebservice, ApiKey, ConsumerKey, ConsumerSecret, AccessToken, AccessTokenSecret, IdCustomer, SessionCode, TransportCompany)
    VALUES (@nombreEndpoint, @urlTienda, @urlWebservice, @apiKey, @consumerKey, @consumerSecret, @accessToken, @accessTokenSecret, @idCustomer, @sessionCode, @transportCompany)
    `;
    await request
      .input('nombreEndpoint', sql2.NVarChar, nombreEndpoint)
      .input('UrlTienda', sql2.NVarChar, urlTienda)
      .input('UrlWebservice', sql2.NVarChar, urlWebservice)
      .input('apiKey', sql2.NVarChar, apiKey)
      .input('consumerKey', sql2.NVarChar, consumerKey)
      .input('consumerSecret', sql2.NVarChar, consumerSecret)
      .input('accessToken', sql2.NVarChar, accessToken)
      .input('accessTokenSecret', sql2.NVarChar, accessTokenSecret)
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

async function updateClientInDB(clientId, nombreEndpoint, urlTienda, urlWebservice, idCustomer, sessionCode, transportCompany) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
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
      .input('nombreEndpoint', sql2.NVarChar, nombreEndpoint)
      .input('urlTienda', sql2.NVarChar, urlTienda)
      .input('urlWebservice', sql2.NVarChar, urlWebservice)
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
      DELETE FROM MiddlewareMagento
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('clientId', sql2.Int, clientId)
      .query(query);
    console.log('Cliente eliminado correctamente de la base de datos.');
  } catch (error) {
    console.error('Error al eliminar de la base de datos:', error);
    throw error;
  }
}




module.exports = { insertIntoDB, updateClientInDB, deleteClientFromDB };