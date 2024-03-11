const { pool2, sql2, connectToDatabase2 } = require('../utils/database');

async function insertIntoDB(nombre, uid_cliente, departamento_exp) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
    INSERT INTO MiddlewareGLS (nombre, uid_cliente, departamento_exp)
    VALUES (@nombre, @uid_cliente, @departamento_exp)
    `;
    await request
      .input('nombre', sql2.NVarChar, nombre)
      .input('uid_cliente', sql2.UniqueIdentifier, uid_cliente)
      .input('departamento_exp', sql2.NVarChar, departamento_exp)
      .query(query);
    console.log('Datos insertados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al insertar en la base de datos:', error);
    throw error;
  }
}

async function insertIntoDBCli(Departamento, Correo) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
    INSERT INTO MwClientesGLS (Departamento, Correo)
    VALUES (@Departamento, @Correo)
    `;
    await request
      .input('Departamento', sql2.NVarChar, Departamento)
      .input('Correo', sql2.NVarChar, Correo)
      .query(query);
    console.log('Datos insertados correctamente en la base de datos.');
  } catch (error) {
    console.error('Error al insertar en la base de datos:', error);
    throw error;
  }
}

async function updateClientInDB(clientId, nombre, uid_cliente, departamento_exp) {
  try {
    const pool2 = await connectToDatabase2();
    const request = pool2.request();
    const query = `
      UPDATE MiddlewareGLS 
      SET nombre = @nombre, 
          UID_Cliente = @uid_cliente, 
          Departamento_Exp = @departamento_exp
      WHERE Id = @clientId
    `;
    console.log('Consulta SQL:', query);
    await request
      .input('nombre', sql2.NVarChar, nombre)
      .input('uid_cliente', sql2.UniqueIdentifier, uid_cliente)
      .input('departamento_exp', sql2.NVarChar, departamento_exp)
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
      DELETE FROM MiddlewareGLS
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

module.exports = { insertIntoDB, updateClientInDB, deleteClientFromDB, insertIntoDBCli };