/*const fs = require('fs');
const axios = require('axios');
const sql = require('mssql');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');
const xml2js = require('xml2js');
const cron = require('node-cron');
require('dotenv').config();

// Programa las tareas cron
//cron.schedule('30 * * * *', async () => {
    // Consultar pedidos cada 30 minutos
    console.log('Ejecutando consulta a GLS cada 30 minutos...');

    // Configurar los valores de uidCliente y codigo
    const uidCliente = process.env.UID_CLIENTE;
    const codigo = "2ab821a4-a5c9-46e9-9fd1-1226af825585";

    await consultarPedidoPeriodico(uidCliente, codigo);
});

// Función para consultar pedidos
async function consultarPedidoGLS(uidCliente, codigo) {
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
        //console.log('Respuesta XML de GLS:', xmlData);

        // Parsear el XML para obtener peso y volumen
        const peso = await parsearPesoDesdeXML(xmlData);
        const volumen = await parsearVolumenDesdeXML(xmlData);

        //console.log('Peso:', peso);
        //console.log('Volumen:', volumen);

        // Actualizar la base de datos si es necesario
        await actualizarBaseDeDatos(codigo, peso, volumen);
    } catch (error) {
        console.error('Error al realizar la consulta a GLS:', error);
        throw error;
    }
}

// Función para consultar pedidos cada 30 minutos
async function consultarPedidoPeriodico(uidCliente, codigo) {
    // Lógica para consultar pedidos
    // Por ejemplo, puedes llamar a consultarPedidoGLS con los parámetros necesarios
    await consultarPedidoGLS(uidCliente, codigo);
}

// Función para actualizar la base de datos
async function actualizarBaseDeDatos(codigo, peso, volumen) {
    let pool;
    try {
        // Conectar a la base de datos
        pool = await connectToDatabase();

        // Consultar valores actuales
        const queryConsulta = `
            SELECT nFree7, nFree8
            FROM CabeceraPedidoTest
            WHERE OrderNumber = '1234561007';
        `;

        const requestConsulta = pool.request();

        const resultConsulta = await requestConsulta.query(queryConsulta);

        const existeFila = resultConsulta.recordset.length > 0;
        if (!existeFila) {
            console.log('La fila con OrderNumber no existe en la base de datos.');
            return;
        }

        const pesoActual = resultConsulta.recordset[0]?.nFree7;
        const volumenActual = resultConsulta.recordset[0]?.nFree8;

        console.log('Antes de la actualización - Peso:', pesoActual, 'Volumen:', volumenActual);

        // Verificar si la actualización es necesaria
        if (peso !== null && volumen !== null) {
            // Tomar el primer elemento de cada arreglo y convertir ',' a '.' antes de parsear
            const pesoNumerico = parseFloat(peso[0]?.replace(',', '.')) || 0.0;
            const volumenNumerico = parseFloat(volumen[0]?.replace(',', '.')) || 0.0;
            console.log('Tipo de dato del volumen antes de la actualización:', typeof volumenNumerico);
            console.log('Valores a insertar - Peso:', peso, 'Volumen:', volumen);


            if (!isNaN(pesoNumerico) && !isNaN(volumenNumerico)) {
                const request = pool.request();

                const query = `
                    UPDATE CabeceraPedidoTest
                    SET nFree7 = @peso, nFree8 = @volumen
                    WHERE OrderNumber = '1234561007';
                `;

                // Añadir parámetros a la solicitud
                request.input('peso', sql.Decimal(18, 8), peso);
                request.input('volumen', sql.Decimal(18, 8), volumen);


                const resultUpdate = await request.query(query);

                if (resultUpdate.rowsAffected[0] === 0) {
                    console.log('La actualización no afectó a ninguna fila.');
                }

                // Consultar los valores actualizados después de la actualización
                const resultConsultaActualizado = await requestConsulta.query(queryConsulta);

                // Mostrar cómo están los campos después de la actualización
                console.log('Después de la actualización - Peso:', resultConsultaActualizado.recordset[0]?.nFree7, 'Volumen:', resultConsultaActualizado.recordset[0]?.nFree8);
                console.log('Base de datos actualizada correctamente.');
            } else {
                console.log('Los valores de peso y/o volumen no son numéricos válidos. No se puede realizar la actualización.');
            }
        } else {
            console.log('Los valores de peso y volumen no son válidos o están ausentes. No es necesaria la actualización.');
        }
    } catch (error) {
        console.error('Error al actualizar la base de datos:', error.message);
    } finally {
        // Cerrar la conexión (si se ha creado)
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
            //console.log("Expediciones:", expediciones);

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
            // Acceder a la información del volumen
            const expediciones = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'];
            const volumen = parseFloat(expediciones[0]?.['vol'][0]?.replace(',', '.')) || 0.0;

            // Después de la línea que obtiene el volumen desde el XML
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

module.exports = { consultarPedidoGLS, consultarPedidoPeriodico };
*/