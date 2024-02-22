const { execSync } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const sql = require('mssql');
const sqlite3 = require('sqlite3');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');
const xml2js = require('xml2js');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');

function consultaAGls() {
    cron.schedule('50 10 * * *', async () => {
        // Ejecutar consultas a las 6:00
        console.log('Ejecutando consulta a GLS a las 6:00');

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
                await consultarPedidosGLSYActualizar(row.uid_cliente, row.departamento_exp);
            }

            // Cerrar la conexión a la base de datos
            //await closeDatabaseConnection();
        } catch (error) {
            console.error('Error al ejecutar la consulta a GLS:', error);
        }
    });
}


async function consultarPedidosGLSYActualizar(uidCliente, departamentoExp) {
    try {
        const fechaAyerStr = moment().subtract(1, 'days').format('MM/DD/YYYY');

         // Leer el archivo CSV
         const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
         const rows = [];

         fs.createReadStream(csvFilePath)
         .pipe(csvParser())
         .on('data', (row) => {
             // Filtrar los registros del día anterior con el departamento_exp correspondiente
             if (
                 moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isSameOrAfter(moment(fechaAyerStr, 'MM/DD/YYYY')) &&
                 moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isBefore(moment(fechaAyerStr, 'MM/DD/YYYY').add(1, 'days')) &&
                 row.departamento_exp === departamentoExp
             ) {
                 rows.push(row);
             } else{
                console.log("No se ha encontrado ningun pedido ayer")
             }
         })
         .on('end', () => {
             // Iterar sobre los registros filtrados
             for (const pedido of rows) {
                 consultarPedidoGLS(uidCliente, pedido.referencia_exp, pedido.identificador_exp);
             }
             
             console.log(`Consultados y actualizados los pedidos de GLS para el departamento ${departamentoExp}.`);
         });
 } catch (error) {
     console.error('Error al consultar pedidos y actualizar la base de datos:', error);
 }
}


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
        const weightDisplacement = await leerWeightDisplacement(OrderNumber);

        // Actualizar la tabla DeliveryNoteHeader
        await actualizarBaseDeDatos(weightDisplacement.IdOrder, peso, volumen, OrderNumber);

        // Almacenar los valores devueltos por leerWeightDisplacement en variables
        const { Weight, Displacement, IdOrder } = weightDisplacement;
        console.log(Weight, Displacement, IdOrder)

        await insertarEnOrderHeader(IdOrder, Weight, Displacement)

    } catch (error) {
        console.error('Error al realizar la consulta a GLS:', error);
        throw error;
    }
}

async function leerWeightDisplacement(OrderNumber) {
    try {
        const pool = await connectToDatabase();
        const query = `
            SELECT dh.Weight, dh.Displacement, oh.IdOrder
            FROM MiddlewareDNH dh
            INNER JOIN MiddlewareOH oh ON dh.IdOrder = oh.IdOrder
            WHERE oh.OrderNumber = @OrderNumber;
        `;
        const request = pool.request();
        request.input('OrderNumber', sql.NVarChar, OrderNumber);
        const result = await request.query(query);
        //await pool.close();
        if (result.recordset.length === 0) {
            console.log('No se encontró el OrderNumber en la tabla OrderHeader.');
            return { Weight: null, Displacement: null, IdOrder: null };
        }
        return {
            Weight: result.recordset[0].Weight,
            Displacement: result.recordset[0].Displacement,
            IdOrder: result.recordset[0].IdOrder
        };
    } catch (error) {
        console.error('Error al leer Weight y Displacement desde DeliveryNoteHeader:', error);
        return { Weight: null, Displacement: null, IdOrder: null };
    }
}

async function insertarEnOrderHeader(IdOrder, Weight, Displacement) {
    try {
        const pool = await connectToDatabase();
        const query = `
            UPDATE MiddlewareOH
            SET nFree7 = @peso, nFree8 = @volumen
            WHERE IdOrder = @IdOrder;
        `;
        const request = pool.request();
        request.input('IdOrder', sql.NVarChar, IdOrder);
        request.input('Weight', sql.Decimal(18, 8), Weight);
        request.input('Displacement', sql.Decimal(18, 8), Displacement);
        await request.query(query);
        //await pool.close();
        console.log('Datos insertados en OrderHeader correctamente.', 'IdOrder:', IdOrder); // Agrega el console.log aquí
    } catch (error) {
        console.error('Error al insertar en OtraTabla:', error.message);
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
            FROM MiddlewareOH
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
            UPDATE MiddlewareDNH
            SET Weight = @peso, Displacement = @volumen
            WHERE IdOrder = @IdOrder;
        `;

        requestUpdate.input('peso', sql.Decimal(18, 8), peso);
        requestUpdate.input('volumen', sql.Decimal(18, 8), volumen);
        requestUpdate.input('IdOrder', sql.Int, IdOrder);

        await requestUpdate.query(queryUpdate);

        console.log('Base de datos actualizada correctamente.', 'IdOrder:', IdOrder); // Agrega el console.log aquí
    } catch (error) {
        console.error('Error al actualizar la base de datos:', error.message);
    } finally {
        if (pool) {
            //await pool.close();
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

module.exports = { consultarPedidoGLS, consultaAGls };
