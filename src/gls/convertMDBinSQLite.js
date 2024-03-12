const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');

const mdbFilePath = '/home/admin81/shares/GLS/data/expediciones.mdb';
const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';

function convertTableToCSV() {
    cron.schedule('20 13 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });

    cron.schedule('14 16 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });

    cron.schedule('14 17 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });

    cron.schedule('14 18 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });

    cron.schedule('14 19 * * *', () => {
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
    cron.schedule('25 13 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });

    cron.schedule('20 16 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });

    cron.schedule('20 17 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });

    
    cron.schedule('20 18 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });

    
    cron.schedule('20 19 * * *', () => {
        const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(csvFilePath);
            console.log('Archivo CSV eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo CSV:', error);
        }
    });
}

module.exports = { convertTableToCSV, deleteCSVFile };


