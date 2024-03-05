const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');

const mdbFilePath = '/home/admin81/shares/GLS/data/expediciones.mdb';
const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';

function convertTableToCSV() {
    cron.schedule('33 9 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });
}


function deleteCSVFile() {
    cron.schedule('36 9 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });
}

//Tracking
function convertTableToCSV2() {
    cron.schedule('08 8 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });
}


function deleteCSVFile2() {
    cron.schedule('12 8 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });
}
module.exports = { convertTableToCSV, deleteCSVFile, deleteCSVFile2, convertTableToCSV2 };


