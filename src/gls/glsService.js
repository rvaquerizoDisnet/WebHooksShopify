/*const fs = require('fs');
const axios = require('axios');
const sql = require('mssql');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');
const xml2js = require('xml2js');
const cron = require('node-cron');
require('dotenv').config();
const ADODB = require('node-adodb');

cron.schedule('0 7 * * *', async () => {
    // Ejecutar consultas a las 7:00
    console.log('Ejecutando consulta a GLS a las 7:00');

    try {
        // Conectar a la base de datos
        const pool = await connectToDatabase();

        // Consultar uid_cliente y departamento_exp de la tabla MiddlewareGLS
        const query = `
            SELECT uid_cliente, departamento_exp
            FROM MiddlewareGLS;
        `;
        const result = await pool.query(query);

        // Recorrer los resultados y realizar las consultas a GLS para cada registro
        for (const row of result.recordset) {
            await consultarPedidosGLSYActualizar(pool, row.uid_cliente, row.departamento_exp);
        }

        // Cerrar la conexión a la base de datos
        await closeDatabaseConnection();
    } catch (error) {
        console.error('Error al ejecutar la consulta a GLS:', error);
    }
});




// Función para consultar pedidos a GLS y actualizar la base de datos
async function consultarPedidosGLSYActualizar(pool, uidCliente, departamentoExp) {
    try {
        // Obtener la fecha de ayer
        const fechaAyer = new Date();
        fechaAyer.setDate(fechaAyer.getDate() - 1);
        const fechaAyerStr = fechaAyer.toISOString().split('T')[0]; // Formato de fecha YYYY-MM-DD

        // Conectar al archivo Access
        const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=ruta_al_archivo.accdb;`);

        // Consultar los registros del día anterior con el departamento_exp correspondiente
        const pedidosDiaAnterior = await connection.query(`SELECT referencia_exp, departamento_exp, identificador_exp FROM tabla_access WHERE fechaTransmision_exp = '${fechaAyerStr}' AND departamento_exp = '${departamentoExp}'`);

        // Realizar consulta al webservice de GLS para cada pedido
        for (const pedido of pedidosDiaAnterior) {
            await consultarPedidoGLS(uidCliente, pedido.referencia_exp, pedido.identificador_exp);
        }

        console.log(`Consultados y actualizados los pedidos de GLS para el departamento ${departamentoExp}.`);
    } catch (error) {
        console.error('Error al consultar pedidos y actualizar la base de datos:', error);
    }
}



// Función para consultar pedidos
async function consultarPedidoGLS(uidCliente, OrderNumber, codigo) {
    const url = process.env.GLS_URL;
    const xmlBody = `
        <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
            <soap12:Body>
                <GetExpCli xmlns="http://www.asmred.com/">
                    <codigo>${codigo}</codigo>
                    <uid>${uidCliente}</uid>
                </GetExpCli>
            </soap12:Body>
        </soap12:Envelope>`;

    try {
        const response = await axios.post(url, xmlBody, {
            headers: {
                'Content-Type': 'text/xml; charset=UTF-8',
            },
        });

        const xmlData = response.data;
        // Parsear el XML para obtener peso y volumen
        const peso = await parsearPesoDesdeXML(xmlData);
        const volumen = await parsearVolumenDesdeXML(xmlData);

        await actualizarBaseDeDatos(OrderNumber, peso, volumen);
    } catch (error) {
        console.error('Error al realizar la consulta a GLS:', error);
        throw error;
    }
}


async function actualizarBaseDeDatos(OrderNumber, peso, volumen) {
    let pool;
    try {
        // Conectar a la base de datos
        pool = await connectToDatabase();

        // Consultar el IdOrder relacionado con el OrderNumber
        const queryConsultaIdOrder = `
            SELECT IdOrder
            FROM OrderHeader
            WHERE OrderNumber = @OrderNumber;
        `;

        const requestConsultaIdOrder = pool.request();
        requestConsultaIdOrder.input('OrderNumber', sql.NVarChar, OrderNumber);

        const resultConsultaIdOrder = await requestConsultaIdOrder.query(queryConsultaIdOrder);

        if (resultConsultaIdOrder.recordset.length === 0) {
            console.log('No se encontró el OrderNumber en la tabla OrderHeader.');
            return;
        }

        const IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;

        // Actualizar la tabla DeliveryNoteHeader con el IdOrder correspondiente
        const requestUpdate = pool.request();
        const queryUpdate = `
            UPDATE DeliveryNoteHeader
            SET Weight = @peso, Displacement = @volumen
            WHERE IdOrder = @IdOrder;
        `;

        requestUpdate.input('peso', sql.Decimal(18, 8), peso);
        requestUpdate.input('volumen', sql.Decimal(18, 8), volumen);
        requestUpdate.input('IdOrder', sql.Int, IdOrder);

        await requestUpdate.query(queryUpdate);

        console.log('Base de datos actualizada correctamente.');
    } catch (error) {
        console.error('Error al actualizar la base de datos:', error.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('Conexión cerrada correctamente.');
        }
    }
}


// Función para parsear el peso desde XML
async function parsearPesoDesdeXML(xmlData) {
    try {
        // Parsear el XML a objeto JavaScript
        const parsedData = await xml2js.parseStringPromise(xmlData);

        // Verificar si la propiedad específica está presente
        if (
            parsedData &&
            parsedData['soap:Envelope'] &&
            parsedData['soap:Envelope']['soap:Body'] &&
            parsedData['soap:Envelope']['soap:Body'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp']
        ) {
            const expediciones = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'];
            const peso = parseFloat(expediciones[0]?.['kgs'][0]?.replace(',', '.')) || 0.0;
            console.log("Peso parseado:", peso);
            return peso;
        } else {
            // Mostrar un mensaje de error si la propiedad no está presente
            console.error('La estructura del objeto parsedData no es la esperada. No se pudo encontrar la propiedad "kgs".');
            return null;
        }
    } catch (error) {
        console.error('Error al parsear el peso desde XML:', error);
        return null;
    }
}

// Función para parsear el volumen desde XML
async function parsearVolumenDesdeXML(xmlData) {
    try {
        // Parsear el XML a objeto JavaScript
        const parsedData = await xml2js.parseStringPromise(xmlData);

        // Verificar si la propiedad específica está presente
        if (
            parsedData &&
            parsedData['soap:Envelope'] &&
            parsedData['soap:Envelope']['soap:Body'] &&
            parsedData['soap:Envelope']['soap:Body'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp']
        ) {
            const expediciones = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'];
            const volumen = parseFloat(expediciones[0]?.['vol'][0]?.replace(',', '.')) || 0.0;
            console.log('Volumen parseado:', volumen);
            return volumen;
        } else {
            // Mostrar un mensaje de error si la propiedad no está presente
            console.error('La estructura del objeto parsedData no es la esperada. No se pudo encontrar la propiedad "vol".');
            return null;
        }
    } catch (error) {
        console.error('Error al parsear el volumen desde XML:', error);
        return null;
    }
}

module.exports = { consultarPedidoGLS };
*/
