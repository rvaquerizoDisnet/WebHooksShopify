const { execSync } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, connectToDatabase } = require('../utils/database');
const nodemailer = require('nodemailer');
const sql = require('mssql');


async function obtenerCorreosDepartamento(departamento) {
    try {
        const pool = await connectToDatabase(2); 
        const query = `
            SELECT Correo
            FROM MwClientesGLS
            WHERE Departamento = '${departamento}'
        `;
        const result = await pool.request().query(query);
        if (result.recordset.length > 0) {
            const correos = result.recordset.map(record => record.Correo);
            return correos; 
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el correo del departamento desde la base de datos:', error);
        throw error; 
    }
}

async function enviarCorreoIncidencia(albaran, departamento, codexp, evento, fecha, nombre_dst, localidad_dst, cp_dst, tfno_dst, email_dst, calle_dst) {
    try {
        const destinatariosCorreo = await obtenerCorreosDepartamento(departamento);
        if (destinatariosCorreo) {
            let destinatarios = destinatariosCorreo;
            if (!Array.isArray(destinatariosCorreo)) {
                destinatarios = [destinatariosCorreo];
            }

            const transporter = nodemailer.createTransport({
                host: 'mail.disnet.es',
                port: 25,
                secure: false,
                ignoreTLS: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: [...destinatarios, process.env.EMAIL_3],
                subject: `INC ${departamento} GLS`,
                text: `Se ha registrado una incidencia en el pedido con los siguientes detalles:\n\nNumero de pedido: ${albaran}\nCodExp: ${codexp}\nSu estado es: ${evento}\nFecha: ${fecha}\n\nDetalles del destinatario:\nNombre: ${nombre_dst}\nTelefono: ${tfno_dst}\nEmail: ${email_dst}\nCalle: ${calle_dst}\nlocalidad: ${localidad_dst}\nCodigo Postal: ${cp_dst}`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Correo electrónico enviado:', info.response);
        } else {
            console.log(`No se encontró el correo asociado al departamento ${departamento}. Se enviará a la dirección genérica.`);
        }
    } catch (error) {
        console.log('Error en enviarCorreoIncidencia:', error);
    }
}


async function enviarCorreoSolucion(albaran, departamento, codexp, evento, fecha, nombre_dst, localidad_dst, cp_dst, tfno_dst, email_dst, calle_dst) {
    try {
        const destinatariosCorreo = await obtenerCorreosDepartamento(departamento);
        if (destinatariosCorreo) {
            let destinatarios = destinatariosCorreo;
            if (!Array.isArray(destinatariosCorreo)) {
                destinatarios = [destinatariosCorreo];
            }

            const transporter = nodemailer.createTransport({
                host: 'mail.disnet.es',
                port: 25,
                secure: false,
                ignoreTLS: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: [...destinatarios, process.env.EMAIL_3],
                subject: `INC ${departamento} SOL GLS`,
                text: `Se ha registrado una solución para la incidencia en el pedido con los siguientes detalles:\n\nNumero de pedido: ${albaran}\nCodExp: ${codexp}\nSu estado es ${evento}\nFecha: ${fecha}\n\nDetalles del destinatario:\nNombre: ${nombre_dst}\nTelefono: ${tfno_dst}\nEmail: ${email_dst}\nCalle: ${calle_dst}\nLocalidad: ${localidad_dst}\nCodigo Postal: ${cp_dst}`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Correo electrónico enviado:', info.response);
        } else {
            console.log(`No se encontró el correo asociado al departamento ${departamento}. Se enviará a la dirección genérica.`);
        }
    } catch (error) {
        console.log('Error en enviarCorreoSolucion:', error);
    }
}


function cronGLS(){
    cron.schedule('04 16 * * *', async () => {
        console.log('Ejecutando consulta a GLS a las 17:04');
        await consultaAGls();
    });

    cron.schedule('04 13 * * *', async () => {
        console.log('Ejecutando consulta a GLS a las 14:04');
        await consultaAGls();
    });

    cron.schedule('04 19 * * *', async () => {
        console.log('Ejecutando consulta a GLS a las 20:04');
        await consultaAGls();
    });
}

async function consultaAGls() {
    try {
        // Conectar a la base de datos
        const pool = await connectToDatabase(2);

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

    } catch (error) {
        console.error('Error al ejecutar la consulta a GLS:', error);
    }
}


async function consultarPedidosGLSYActualizar(uidCliente, departamentoExp) {
    try {
        const fechaAyerStr = moment().subtract(1, 'days').format('MM/DD/YYYY');
        //const fechaInicioMes = '03/01/2024';
        //const fechaFinMes = '03/08/2024'; 

        // Leer el archivo CSV
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        const rows = [];

        fs.createReadStream(csvFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
             // Filtrar los registros del día anterior con el departamento_exp correspondiente
            if (
                //moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isSameOrAfter(moment(fechaInicioMes, 'MM/DD/YYYY')) &&
                //moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isBefore(moment(fechaFinMes, 'MM/DD/YYYY').add(1, 'days')) &&
                moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isSameOrAfter(moment(fechaAyerStr, 'MM/DD/YYYY')) &&
                moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isBefore(moment(fechaAyerStr, 'MM/DD/YYYY').add(1, 'days')) && 
                row.departamento_exp === departamentoExp
            ){
                rows.push(row);
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
        const peso = await parsearPesoDesdeXML(xmlData);
        const volumen = await parsearVolumenDesdeXML(xmlData);
        const weightDisplacement = await leerWeightDisplacement(OrderNumber.toString());

        const estadoPedido = await consultarEstadoPedido(xmlData);
        const existeBD  = await verificarAlbaranExistenteIncidencia(OrderNumber.toString())
        if (!(estadoPedido == 'INCIDENCIA') && !existeBD){
            await actualizarBaseDeDatos(OrderNumber.toString(), peso, volumen);
            const { Weight, Displacement, IdOrder } = weightDisplacement;
            await insertarEnOrderHeader(IdOrder, Weight, Displacement)
            console.log("Pedido actualizado con IdOrder: ", IdOrder);
        }else {
            console.log("Este pedido tiene una incidencia")
        }


    } catch (error) {
        console.error('Error al realizar la consulta a GLS:', error);
        throw error;
    }
}



async function leerWeightDisplacement(OrderNumber) {
    while (true) {
        try {
            const pool = await connectToDatabase(1);
            const query = `
                SELECT dh.Weight, dh.Displacement, oh.IdOrder
                FROM DeliveryNoteHeader dh
                INNER JOIN OrderHeader oh ON dh.IdOrder = oh.IdOrder
                WHERE oh.OrderNumber = @OrderNumber;
            `;
            const request = pool.request();
            request.input('OrderNumber', sql.NVarChar, OrderNumber);
            const result = await request.query(query);

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
            const esErrorDeConexion = error.code === 'ETIMEOUT' || error.code === 'ECONNRESET';

            if (esErrorDeConexion) {
                console.error('Error de conexión. Reintentando en 5 segundos...');
                await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos antes de reintentar
            } else {
                console.error('Error al leer Weight y Displacement desde DeliveryNoteHeader:', error);
                return { Weight: null, Displacement: null, IdOrder: null };
            }
        }
    }
}


async function insertarEnOrderHeader(IdOrder, Weight, Displacement) {
    try {
        const pool = await connectToDatabase(1);
        const query = `
            UPDATE OrderHeader
            SET nFree7 = @peso, nFree8 = @volumen
            WHERE IdOrder = @IdOrder;
        `;
        const request = pool.request();
        request.input('IdOrder', sql.NVarChar, IdOrder.toString());
        request.input('peso', sql.Decimal(18, 8), Weight);
        request.input('volumen', sql.Decimal(18, 8), Displacement);
        await request.query(query);
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 10000)); 
            const pool = await connectToDatabase(1);
            const query = `
                UPDATE OrderHeader
                SET nFree7 = @peso, nFree8 = @volumen
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            request.input('peso', sql.Decimal(18, 8), Weight);
            request.input('volumen', sql.Decimal(18, 8), Displacement);
            await request.query(query);
        } else {
            console.error('Error al insertar en OrderHeader:', IdOrder, error.message);
        }
    }
}


async function actualizarBaseDeDatos(OrderNumber, peso, volumen) {

    try {
        // Conectar a la base de datos
        const pool = await connectToDatabase(1);

        // Consultar el IdOrder relacionado con el OrderNumber
        const queryConsultaIdOrder = `
            SELECT IdOrder
            FROM OrderHeader
            WHERE OrderNumber = @OrderNumber;
        `;

        const requestConsultaIdOrder = pool.request();
        requestConsultaIdOrder.input('OrderNumber', sql.NVarChar, OrderNumber.toString()); 

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

        console.log('Base de datos actualizada correctamente.', 'IdOrder:', IdOrder);
    } catch (error) {
        // Manejar el error específico de deadlock
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 10000)); // Espera de 1 segundo
            // Reintentar la operación
            await actualizarBaseDeDatos(OrderNumber, peso, volumen);
        } else {
            console.error('Error al actualizar la base de datos:', OrderNumber, error.message);
        }
    } finally {
        if (pool) {
            console.log('Conexión cerrada correctamente.');
        }
    }
}


async function consultarEstadoPedido(xmlData) {
    try {
        const parsedData = await xml2js.parseStringPromise(xmlData);
        let departamento = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['nombre_org'][0];
        let departamento2 = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['departamento_org'][0];
        let trackingList = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['tracking_list'][0]['tracking'];
        let ultimoTracking = trackingList[trackingList.length - 1];
        let tipoUltimoTracking = ultimoTracking['tipo'][0];
        let codigo = ultimoTracking['codigo'][0];
        let codexp = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['codexp'][0];
        let albaran = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['albaran'][0];
        let evento = ultimoTracking['evento'][0];
        let fecha = ultimoTracking['fecha'][0];
        let nombre_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['nombre_dst'][0];
        let localidad_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['localidad_dst'][0];
        let cp_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['cp_dst'][0];
        let tfno_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['tfno_dst'][0];
        let email_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['email_dst'][0];
        let calle_dst = parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['calle_dst'][0];
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
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['tracking_list'] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['tracking_list'][0] &&
            parsedData['soap:Envelope']['soap:Body'][0]['GetExpCliResponse'][0]['GetExpCliResult'][0]['expediciones'][0]['exp'][0]['tracking_list'][0]['tracking']
        ) {
            if (tipoUltimoTracking === 'INCIDENCIA') {
                // Verificar si el albarán ya existe en la tabla MwIncidenciasGLS
                const existeAlbaran = await verificarAlbaranExistenteIncidencia(albaran);
                const codigoAlbaran = await obtenerCodigoAlbaranDesdeBD(albaran);
                
                // Si el albarán no existe, procedemos con la inserción
                if (!existeAlbaran) {
                    const query = `
                        INSERT INTO MwIncidenciasGLS (Albaran, CodExp, Departamento, EventoIncidencia, FechaIncidencia, Codigo, Departamento2)
                        VALUES ('${albaran}', '${codexp}', '${departamento}', '${evento}', '${fecha}', '${codigo}', '${departamento2}')
                    `;

                    // Ejecutar la consulta
                    const pool = await connectToDatabase(2);
                    const result = await pool.request().query(query);
                    await enviarCorreoIncidencia(albaran, departamento, codexp, evento, fecha, nombre_dst, localidad_dst, cp_dst, tfno_dst, email_dst, calle_dst );
                    console.log("Información del pedido guardada en la base de datos.");
                } else if(codigo != codigoAlbaran){

                    await eliminarAlbaran(albaran);
                    const query = `
                        INSERT INTO MwIncidenciasGLS (Albaran, CodExp, Departamento, EventoIncidencia, FechaIncidencia, Codigo, Departamento2)
                        VALUES ('${albaran}', '${codexp}', '${departamento}', '${evento}', '${fecha}', '${codigo}', '${departamento2}')
                    `;
                    const pool = await connectToDatabase(2);
                    const result = await pool.request().query(query);
                    await enviarCorreoIncidencia(albaran, departamento, codexp, evento, fecha, nombre_dst, localidad_dst, cp_dst, tfno_dst, email_dst, calle_dst);
                } else {
                    console.log("El albarán ya existe en la base de datos. No se realizará la inserción.");
                }
            } else if (tipoUltimoTracking == 'ESTADO' || tipoUltimoTracking == 'ENTREGA' || tipoUltimoTracking == 'POD' || tipoUltimoTracking == 'SOLUCION' || tipoUltimoTracking == 'URLPARTNER') {
                const existeAlbaranIncidencia = await verificarAlbaranExistenteIncidencia(albaran);

                const existeAlbaranPesado = await verificarAlbaranExistentePesado(albaran);

                // Si el albarán existe, eliminar la línea correspondiente
                if (existeAlbaranIncidencia) {
                    await enviarCorreoSolucion(albaran, departamento, codexp, evento, fecha, nombre_dst, localidad_dst, cp_dst, tfno_dst, email_dst, calle_dst);
                    await eliminarAlbaran(albaran);
                } else if (existeAlbaranPesado){
                    await eliminarAlbaranPesado(albaran)
                }
            } else if (codigo == -1 || codigo == -10 ){
                console.log("El pedido no esta pesado")
                // Verificar si el albarán ya existe en la tabla MwIncidenciasGLS
                const existeAlbaran = await verificarAlbaranExistentePesado(albaran);
                
                // Si el albarán no existe, procedemos con la inserción
                if (!existeAlbaran) {
                    // Construir la consulta SQL
                    const query = `
                        INSERT INTO MwGLSNoPesado (Albaran, CodExp, Departamento, Departamento2)
                        VALUES ('${albaran}', '${codexp}', '${departamento}', '${departamento2}')
                    `;
                    const pool = await connectToDatabase(2);
                    const result = await pool.request().query(query);
                    console.log("Información del pedido guardada en la base de datos.");
                } else {
                    console.log("El albarán ya existe en la base de datos. No se realizará la inserción.");
                }
            }
            return tipoUltimoTracking;
        } else {
            console.error('La estructura del objeto parsedData no es la esperada. No se pudo encontrar la propiedad "tracking_list".');
            return null;
        }
    } catch (error) {
        console.error('Error al parsear el XML o al interactuar con la base de datos:', error);
        return null;
    }
}


async function obtenerCodigoAlbaranDesdeBD(albaran) {
    try {
        const pool = await connectToDatabase(2);
        const query = `
            SELECT Codigo
            FROM MwIncidenciasGLS
            WHERE Albaran = '${albaran}'
        `;
        const result = await pool.request().query(query);
        if (result.recordset.length > 0) {
            return result.recordset[0].Codigo;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el código del albarán desde la base de datos:', error);
        throw error;
    }
}


async function verificarAlbaranExistenteIncidencia(albaran) {
    try {
        const pool = await connectToDatabase(2);
        const result = await pool.request()
            .input('albaran', sql.VarChar, albaran)
            .query('SELECT COUNT(*) AS Count FROM MwIncidenciasGLS WHERE Albaran = @albaran');

        return result.recordset[0].Count > 0;
    } catch (error) {
        console.error('Error al verificar la existencia del albarán en la base de datos:', error);
        return false;
    }
}

async function verificarAlbaranExistentePesado(albaran) {
    try {
        const pool = await connectToDatabase(2);
        const result = await pool.request()
            .input('albaran', sql.VarChar, albaran)
            .query('SELECT COUNT(*) AS Count FROM MwGLSNoPesado WHERE Albaran = @albaran');
        return result.recordset[0].Count > 0;
    } catch (error) {
        console.error('Error al verificar la existencia del albarán en la base de datos:', error);
        return false;
    }
}



async function eliminarAlbaran(albaran) {
    try {
        const pool = await connectToDatabase(2);
        const result = await pool.request()
            .input('albaran', sql.VarChar, albaran)
            .query('DELETE FROM MwIncidenciasGLS WHERE Albaran = @albaran');
        
        return true;
    } catch (error) {
        console.error('Error al eliminar el albarán de la base de datos:', error);
        return false;
    }
}

async function eliminarAlbaranPesado(albaran) {
    try {
        const pool = await connectToDatabase(2);
        const result = await pool.request()
            .input('albaran', sql.VarChar, albaran)
            .query('DELETE FROM MwGLSNoPesado WHERE Albaran = @albaran');
        
        return true;
    } catch (error) {
        console.error('Error al eliminar el albarán de la base de datos:', error);
        return false;
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


//Tracking 
function consultaAGlsTracking() {
    // Consulta a las 17:15 (Debido a la hora del servidor ponemos -1 a la hora)
    cron.schedule('15 16 * * *', async () => {
        console.log('Ejecutando consulta a GLS para el tracking a las 17:15');
        await ejecutarConsultaTracking();
    });

    // Consulta a las 18:15
    cron.schedule('15 17 * * *', async () => {
        console.log('Ejecutando consulta a GLS para el tracking a las 17:15');
        await ejecutarConsultaTracking();
    });

    // Consulta a las 19:15
    cron.schedule('15 18 * * *', async () => {
        console.log('Ejecutando consulta a GLS para el tracking a las 18:15');
        await ejecutarConsultaTracking();
    });

    // Consulta a las 20:15
    cron.schedule('15 19 * * *', async () => {
        console.log('Ejecutando consulta a GLS para el tracking a las 19:15');
        await ejecutarConsultaTracking();
    });
}


async function ejecutarConsultaTracking() {
    console.log('Ejecutando consulta para el tracking');
    try {
        // Conectar a la base de datos
        const pool = await connectToDatabase(2);

        // Consultar uid_cliente y departamento_exp de la tabla MiddlewareGLS
        const query = `
            SELECT uid_cliente, departamento_exp
            FROM MiddlewareGLS;
        `;
        const result = await pool.query(query);

        // Recorrer los resultados y realizar las consultas a GLS para cada registro
        for (const row of result.recordset) {
            await consultarTrackingyActualizar(row.uid_cliente, row.departamento_exp);
        }

    } catch (error) {
        console.error('Error al ejecutar la consulta a GLS:', error);
    }
}

async function consultarTrackingyActualizar(uidCliente, departamentoExp) {
    try {
        const fechaActualStr = moment().format('MM/DD/YYYY');

        // Leer el archivo CSV
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        const rows = [];

        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on('data', (row) => {
                // Filtrar los registros del día actual con el departamento_exp correspondiente
                if (
                    moment(row.fechaTransmision_exp, 'MM/DD/YYYY HH:mm:ss').isSame(moment(fechaActualStr, 'MM/DD/YYYY')) &&
                    row.departamento_exp === departamentoExp
                ) {
                    rows.push(row);
                }
            })
            .on('end', () => {
                // Iterar sobre los registros filtrados
                for (const pedido of rows) {
                    ActualizarBBDDTracking(pedido.referencia_exp, pedido.codbarras_exp); // Pasar el campo codbarras_EXP como argumento
                }

                console.log(`Consultados y actualizados el tracking de GLS para el departamento ${departamentoExp} con la fecha ${fechaActualStr}.`);
            });
    } catch (error) {
        console.error('Error al consultar pedidos y actualizar la base de datos:', error);
    }
}


async function ActualizarBBDDTracking(OrderNumber, codbarrasExp) {
    try {
        const pool = await connectToDatabase(1);
        const queryConsultaIdOrder = `
            SELECT IdOrder
            FROM OrderHeader
            WHERE OrderNumber = @OrderNumber;
        `;

        const requestConsultaIdOrder = pool.request();
        requestConsultaIdOrder.input('OrderNumber', sql.NVarChar, OrderNumber.toString()); 

        const resultConsultaIdOrder = await requestConsultaIdOrder.query(queryConsultaIdOrder);
        if (resultConsultaIdOrder.recordset.length === 0) {
            console.log('No se encontró el OrderNumber en la tabla OrderHeader.');
            return;
        }

        const IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;

        const query = `
            UPDATE DeliveryNoteHeader
            SET TrackingNumber = @codbarrasExp
            WHERE IdOrder = @IdOrder;
        `;
        const request = pool.request();
        request.input('codbarrasExp', sql.NVarChar, codbarrasExp);
        request.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await request.query(query);
        console.log(`Se ha actualizado el campo TrackingNumber con el valor ${codbarrasExp} y el IdOrder ${IdOrder}.`);
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            // Esperar un breve intervalo antes de reintentar la operación
            await new Promise(resolve => setTimeout(resolve, 5000)); 
            const pool = await connectToDatabase(1);
            const query = `
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @codbarrasExp
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('codbarrasExp', sql.NVarChar, codbarrasExp);
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            await request.query(query);
            console.log(`Se ha actualizado el campo TrackingNumber con el valor ${codbarrasExp} y el IdOrder ${IdOrder}.`);
        } else {
            console.error('Error al insertar en OrderHeader:', IdOrder, error.message);
        }
    }
}

//Incidencias y no pesados:
// Función para consultar datos de las tablas MwIncidenciasGLS y MwGLSNoPesado
function consultarIncidenciasYPesos() {
    // Consulta a las 9:05
    cron.schedule('05 08 * * *', async () => {
        await ejecutarConsulta();
    });

    // Consulta a las 14:00
    cron.schedule('05 11 * * *', async () => {
        await ejecutarConsulta();
    });

    // Consulta a las 14:00
    cron.schedule('05 14 * * *', async () => {
        await ejecutarConsulta();
    });

    // Consulta a las 14:00
    cron.schedule('37 15 * * *', async () => {
        await ejecutarConsulta();
    });

    // Consulta a las 18:00
    cron.schedule('05 17 * * *', async () => {
        await ejecutarConsulta();
    });

    // Consulta a las 20:00
    cron.schedule('55 18 * * *', async () => {
        await ejecutarConsulta();
    });
}

async function ejecutarConsulta() {
    console.log('Consultando datos de las tablas MwIncidenciasGLS y MwGLSNoPesado...');
    try {
        // Conectar a la base de datos
        const pool = await connectToDatabase(2);

        // Consultar datos de MwIncidenciasGLS
        const queryIncidencias = `
            SELECT *
            FROM MwIncidenciasGLS;
        `;
        const resultIncidencias = await pool.query(queryIncidencias);

        // Consultar datos de MwGLSNoPesado
        const queryNoPesado = `
            SELECT *
            FROM MwGLSNoPesado;
        `;
        const resultNoPesado = await pool.query(queryNoPesado);

        // Procesar los resultados y volver a ejecutar consultarPedidoGLS
        const incidencias = resultIncidencias.recordset;
        const noPesados = resultNoPesado.recordset;

        // Iterar sobre las incidencias
        for (const incidencia of incidencias) {
            await reconsultarPedidoGLS(incidencia.Albaran, incidencia.CodExp, incidencia.Departamento2);
        }

        // Iterar sobre los registros no pesados
        for (const noPesado of noPesados) {
            await reconsultarPedidoGLS(noPesado.Albaran, noPesado.CodExp, noPesado.Departamento2);
        }


        console.log('Consultas y actualizaciones realizadas con éxito.');
    } catch (error) {
        console.error('Error al consultar datos de las tablas:', error);
    }
}

// Función para volver a ejecutar consultarPedidoGLS
async function reconsultarPedidoGLS(orderNumber, codexp, departamento2) {
    console.log(`Reconsultando pedido GLS para OrderNumber ${orderNumber}... `, departamento2);
    try {
        const pool = await connectToDatabase(2);
        let uidCliente = '';
        const queryUidCliente = `
            SELECT uid_cliente
            FROM MiddlewareGLS
            WHERE departamento_exp = @departamentoExp;
        `;
        const requestUidCliente = pool.request();
        requestUidCliente.input('departamentoExp', sql.NVarChar, departamento2);
        const resultUidCliente = await requestUidCliente.query(queryUidCliente);
        if (resultUidCliente.recordset.length > 0) {
            uidCliente = resultUidCliente.recordset[0].uid_cliente;
        } else {
            console.error('No se encontró el uid_cliente correspondiente al departamentoExp en la tabla MiddlewareGLS.');
            return;
        }
        await consultarPedidoGLS(uidCliente, orderNumber, codexp);
    } catch (error) {
        console.error('Error al reconsultar pedido GLS:', error);
    }
}




module.exports = { consultarPedidoGLS, consultaAGls, consultaAGlsTracking, cronGLS, consultarIncidenciasYPesos };
