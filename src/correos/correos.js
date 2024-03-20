const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');
const { pool, connectToDatabase } = require('../utils/database');
const sql = require('mssql');
const carpeta = '/home/admin81/shares/24UOC/Export/GECO/';

async function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}${archivo}`;

    let CustomerOrderNumber = null;
    let Tracking = null;

    fs.readFile(rutaArchivo, 'utf8', (err, contenido) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        const lineas = contenido.split('\n');

        lineas.forEach(linea => {
            if (linea.trim() !== '') {
                const campos = linea.split(/\t+/);
                Tracking = campos[5];

                if (campos[19]) {
                    CustomerOrderNumber = campos[19];
                    if (CustomerOrderNumber.includes('@')) {
                        CustomerOrderNumber = campos[20];
                    }
                } else {
                    console.log("CustomerOrderNumber no está definido para esta línea.");
                }
            }

            ActualizarBBDDTracking(CustomerOrderNumber, Tracking);
        });

         // Eliminar el archivo después de procesarlo
         try {
            fs.promises.unlink(rutaArchivo);
            console.log(`Archivo ${archivo} eliminado correctamente.`);
        } catch (error) {
            console.error(`Error al intentar eliminar el archivo ${archivo}:`, error);
        }
    });
}

async function procesarArchivos() {
    try {
        const archivos = fs.readdirSync(carpeta);

        const archivosTxt = archivos.filter(archivo => archivo.endsWith('.txt'));

        if (archivosTxt.length > 0) {
            console.log('Se encontraron los siguientes archivos .txt:', archivosTxt);
            archivosTxt.forEach(archivo => {
                procesarArchivo(archivo);
            });
        } else {
            console.log('No se encontraron archivos .txt en la carpeta.');
        }
    } catch (err) {
        console.error('Error al leer la carpeta:', err);
    }
}


async function ActualizarBBDDTracking(CustomerOrderNumber, Tracking) {
    let IdOrder = null;

    try {
        const pool = await connectToDatabase(1);
        const queryConsultaIdOrder = `
            SELECT IdOrder
            FROM OrderHeader
            WHERE CustomerOrderNumber = @CustomerOrderNumber;
        `;

        const requestConsultaIdOrder = pool.request();
        requestConsultaIdOrder.input('CustomerOrderNumber', sql.NVarChar, CustomerOrderNumber.toString());

        const resultConsultaIdOrder = await requestConsultaIdOrder.query(queryConsultaIdOrder);

        if (resultConsultaIdOrder.recordset.length === 0) {
            console.log('No se encontró el CustomerOrderNumber en la tabla OrderHeader.');
            return;
        }

        if (resultConsultaIdOrder.recordset.length === 1) {
            IdOrder = resultConsultaIdOrder.recordset[0].IdOrder;
        } else {
            await enviarCorreoIncidencia(CustomerOrderNumber, Tracking);
            throw new Error('Hay múltiples IdOrder con TrackingNumber NULL.');
        }

        const query = `
            UPDATE DeliveryNoteHeader
            SET TrackingNumber = @Tracking
            WHERE IdOrder = @IdOrder and St_DeliverynoteHeader = 'FIN';
        `;

        const request = pool.request();
        request.input('Tracking', sql.NVarChar, Tracking);
        request.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await request.query(query);
        console.log("Tracking actualizado para ", IdOrder)
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const pool = await connectToDatabase(1);
            const query = `
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @Tracking
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('Tracking', sql.NVarChar, Tracking);
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            await request.query(query);
            console.log("Tracking actualizado para ", IdOrder)
        } else {
            console.error('Error al insertar en OrderHeader:', IdOrder, error.message);
        }
    }
}


async function enviarCorreoIncidencia(CustomerOrderNumber, Tracking) {
    try {
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
            to: process.env.EMAIL_2,
            subject: `Incidencia en un pedido de Correos`,
            text: `No se ha podido añadir el tracking number al pedido ${CustomerOrderNumber} con el tracking ${Tracking}`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo electrónico enviado:', info.response);
    } catch (error) {
        console.log('Error en enviarCorreoIncidencia:', error);
    }
}



function cronCorreos(){
    cron.schedule('55 11 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 12:55');
        await procesarArchivos();
    });
    cron.schedule('55 16 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 17:55');
        await procesarArchivos();
    });

    cron.schedule('55 15 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 16:55');
        await procesarArchivos();
    });


    cron.schedule('55 14 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 15:55');
        await procesarArchivos();
    });


    cron.schedule('28 16 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 17:25');
        await procesarArchivos();
    });

    cron.schedule('25 15 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 16:25');
        await procesarArchivos();
    });


    cron.schedule('25 14 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 15:25');
        await procesarArchivos();
    });

}


module.exports = { cronCorreos };