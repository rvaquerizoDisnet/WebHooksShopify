const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');

const mdbFilePath = '/home/admin81/shares/GLS/data/expediciones.mdb';
const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
const jsonFilePath = '/home/admin81/shares/GLS/data/expediciones.json';

function convertTableToCSV() {
    cron.schedule('25 9 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });
}

function convertTableToJSON() {
    cron.schedule('25 9 * * *', () => {
        try {
            const exportToJSONCommand = `mdb-export -I json ${mdbFilePath} expediciones > ${jsonFilePath}`;
            execSync(exportToJSONCommand);
            console.log('Tabla expediciones exportada a JSON correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a JSON:', error);
        }
    });
}

function deleteSQLiteFile() {
    cron.schedule('30 6 * * *', () => {
        const sqliteFilePath = '/home/admin81/shares/GLS/data/database.db';
        try {
            fs.unlinkSync(sqliteFilePath);
            console.log('Archivo SQLite eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo SQLite:', error);
        }
    });
}

module.exports = { convertTableToCSV, convertTableToJSON, deleteSQLiteFile };
