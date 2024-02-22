const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');

const mdbFilePath = '/home/admin81/shares/GLS/data/expediciones.mdb';
const csvFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';

function convertTableToCSV() {
    cron.schedule('09 10 * * *', () => {
        try {
            const exportToCSVCommand = `mdb-export ${mdbFilePath} expediciones > ${csvFilePath}`;
            execSync(exportToCSVCommand);
            console.log('Tabla expediciones exportada a CSV correctamente.');
        } catch (error) {
            console.error('Error al exportar la tabla expediciones a CSV:', error);
        }
    });
}


function deleteSQLiteFile() {
    cron.schedule('12 10 * * *', () => {
        const sqliteFilePath = '/home/admin81/shares/GLS/data/expediciones.csv';
        try {
            fs.unlinkSync(sqliteFilePath);
            console.log('Archivo SQLite eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo SQLite:', error);
        }
    });
}

module.exports = { convertTableToCSV, deleteSQLiteFile };
