const fs = require('fs');
const axios = require('axios');
const sql = require('mssql');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');
const xml2js = require('xml2js');

async function consultarPedidoGLS(uidCliente, codigo) {
    const url = "https://wsclientes.asmred.com/b2b.asmx?wsdl";

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
        console.log('Respuesta XML de GLS:', xmlData);

        // Parsear el XML para obtener peso y volumen
        const peso = parsearPesoDesdeXML(xmlData);
        const volumen = parsearVolumenDesdeXML(xmlData);

        console.log(peso);
        console.log(volumen);

        // Actualizar la base de datos
        //await actualizarBaseDeDatos(codigo, peso, volumen); 

    } catch (error) {
        console.error('Error al realizar la consulta a GLS:', error);
        throw error;
    }
}

async function actualizarBaseDeDatos(codigo, peso, volumen) {
    try {
        // Conectar a la base de datos
        await connectToDatabase();

        // Adaptar esta consulta a la BBDD real
        const query = `
            UPDATE TuTabla
            SET Peso = @peso, Volumen = @volumen
            WHERE Codigo = @codigo
        `;

        // Ejecutar la consulta
        await sql.query(query, { codigo, peso, volumen });

        console.log('Base de datos actualizada correctamente.');
    } catch (error) {
        console.error('Error al actualizar la base de datos:', error);
    } finally {
        // Cerrar la conexión
        await closeDatabaseConnection();
    }
}


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
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['kgs']
        ) {
            // Acceder a la información del peso
            const peso = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['kgs'][0];
            console.log("Peso: " + peso);
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
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['vol']
        ) {
            // Acceder a la información del volumen
            const volumen = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['vol'][0];
            console.log("Volumen: " + volumen);
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
