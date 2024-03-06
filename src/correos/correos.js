const { execSync } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();
const moment = require('moment');
const csvParser = require('csv-parser');
const { pool, sql, connectToDatabase } = require('../utils/database');


const carpeta = 'C:\\Users\\RaulV\\Documents\\correos';


// Función para procesar un archivo .txt
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
            // Divide la línea en campos separados por tabulaciones
            const campos = linea.split('\t');

            // Busca la posición de 'ST' en la línea
            const indiceST = campos.findIndex(campo => campo === 'ST');
            if (indiceST !== -1 && indiceST > 0) {
                console.log('Dato encontrado en el archivo', archivo, ':', campos[indiceST - 1]);
            }

            // Busca la secuencia 'PQ4' en la línea
            const indicePQ4 = campos.findIndex(campo => campo.startsWith('PQ4'));
            if (indicePQ4 !== -1 && indicePQ4 < campos.length) {
                console.log('Dato PQ4 encontrado en el archivo', archivo, ':', campos[indicePQ4]);
            }
        });

        // Elimina el archivo después de procesarlo
        fs.unlink(rutaArchivo, err => {
            if (err) {
                console.error('Error al eliminar el archivo:', err);
                return;
            }
            console.log('Archivo eliminado:', archivo);
        });
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
    cron.schedule('45 11 * * *', async () => {
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