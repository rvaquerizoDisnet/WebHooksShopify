const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');
const { pool, sql, connectToDatabase } = require('../utils/database');

const carpeta = '/home/admin81/shares/24UOC/Export/GECO/';

function procesarArchivo(archivo) {
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

        fs.unlink(rutaArchivo, err => {
            if (err) {
                console.error('Error al eliminar el archivo:', err);
                return;
            }
            console.log('Archivo eliminado:', archivo);
        });
    });
}

async function procesarArchivos() {
    const fechaActual = moment().startOf('day');

    try {
        const archivos = fs.readdirSync(carpeta);

        const archivosTxt = archivos.filter(archivo => archivo.endsWith('.txt'));

        if (archivosTxt.length > 0) {
            console.log('Se encontraron los siguientes archivos .txt:', archivosTxt);
            archivosTxt.forEach(archivo => {
                const stats = fs.statSync(`${carpeta}${archivo}`);
                const fechaModificacion = moment(stats.mtime).startOf('day');
                const fechaCreacion = moment(stats.birthtime).startOf('day');

                if (fechaModificacion.isSame(fechaActual, 'day') || fechaCreacion.isSame(fechaActual, 'day')) {
                    procesarArchivo(archivo);
                } else {
                    console.log(`El archivo ${archivo} no fue modificado hoy y será ignorado.`);
                }
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
        const pool = await connectToDatabase();
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
            WHERE IdOrder = @IdOrder;
        `;

        const request = pool.request();
        request.input('Tracking', sql.NVarChar, Tracking);
        request.input('IdOrder', sql.NVarChar, IdOrder.toString());
        await request.query(query);
    } catch (error) {
        if (error.message.includes('deadlocked')) {
            console.error('Se produjo un deadlock. Reintentando la operación en unos momentos...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const pool = await connectToDatabase();
            const query = `
                UPDATE DeliveryNoteHeader
                SET TrackingNumber = @Tracking
                WHERE IdOrder = @IdOrder;
            `;
            const request = pool.request();
            request.input('Tracking', sql.NVarChar, Tracking);
            request.input('IdOrder', sql.NVarChar, IdOrder.toString());
            await request.query(query);
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
    cron.schedule('55 16 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 17:55');
        await procesarArchivos();
    });

    cron.schedule('55 17 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 18:55');
        await procesarArchivos();
    });

    cron.schedule('55 18 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 19:55');
        await procesarArchivos();
    });

    cron.schedule('55 19 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 20:55');
        await procesarArchivos();
    });
}


module.exports = { cronCorreos };