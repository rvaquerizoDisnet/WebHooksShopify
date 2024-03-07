const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, sql, connectToDatabase } = require('../utils/database');


const carpeta = 'C:\\Users\\RaulV\\Documents\\correos';


// Función para procesar un archivo .txt
function procesarArchivo(archivo) {
    const rutaArchivo = `${carpeta}\\${archivo}`;

    // Lee el contenido del archivo
    fs.readFile(rutaArchivo, 'utf8', (err, contenido) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        // Divide el contenido del archivo en líneas
        const lineas = contenido.split('\n');

        // Itera sobre cada línea para extraer los datos
        lineas.forEach(linea => {
            // Divide la línea en campos usando una expresión regular para buscar tabulaciones
            const campos = linea.split(/\t+/);

            const Tracking = campos[5];
            console.log("Tracking ", Tracking)
            if (campos[19]) {
                let CustomerOrderNumber = campos[19];
                if (CustomerOrderNumber.includes('@')) {
                    console.log("Correo electrónico:", CustomerOrderNumber);
                    // Aquí puedes agregar lo que necesites hacer con el correo electrónico
                } else {
                    console.log("CustomerOrderNumber ", CustomerOrderNumber);
                    // Aquí puedes agregar lo que necesites hacer con el número de orden
                }
            } else {
                console.log("CustomerOrderNumber no está definido para esta línea.");
            }
        });

        // Elimina el archivo después de procesarlo
        /*
        fs.unlink(rutaArchivo, err => {
            if (err) {
                console.error('Error al eliminar el archivo:', err);
                return;
            }
            console.log('Archivo eliminado:', archivo);
        });*/
    });
}


// Función para procesar todos los archivos en la carpeta
async function procesarArchivos() {
    // Lee la lista de archivos en la carpeta
    fs.readdir(carpeta, (err, archivos) => {
        if (err) {
            console.error('Error al leer la carpeta:', err);
            return;
        }

        // Filtra los archivos .txt
        const archivosTxt = archivos.filter(archivo => archivo.endsWith('.txt'));

        // Si hay al menos un archivo .txt
        if (archivosTxt.length > 0) {
            console.log('Se encontraron los siguientes archivos .txt:', archivosTxt);
            archivosTxt.forEach(archivo => {
                procesarArchivo(archivo);
            });
        } else {
            console.log('No se encontraron archivos .txt en la carpeta.');
        }
    });
}



function cronCorreos(){
    cron.schedule('01 13 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 6:45');
        await procesarArchivos();
    });

    cron.schedule('45 9 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 10:45');
        await procesarArchivos();
    });

    cron.schedule('45 13 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 14:45');
        await procesarArchivos();
    });

    cron.schedule('45 16 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 17:45');
        await procesarArchivos();
    });

    cron.schedule('45 17 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 18:45');
        await procesarArchivos();
    });

    cron.schedule('45 18 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 19:45');
        await procesarArchivos();
    });

    cron.schedule('45 19 * * *', async () => {
        console.log('Ejecutando consulta a Correos a las 20:45');
        await procesarArchivos();
    });
}


module.exports = { cronCorreos };