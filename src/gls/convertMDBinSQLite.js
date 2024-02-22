const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');

const sqliteSchemaFilePath = '/shares/GLS/data/expediciones_schema.sql';

function createSQLiteTable() {
    cron.schedule('58 8 * * *', () => {
        const mdbFilePath = '/shares/GLS/data/expediciones.mdb';
        const sqliteFilePath = '/shares/GLS/data/database.db';
        
        const schemaCommand = `mdb-schema ${mdbFilePath} sqlite > ${sqliteSchemaFilePath}`;
        
        try {
            execSync(schemaCommand);
            console.log('Esquema de tabla expediciones generado.');
            
            const createTableCommand = `sqlite3 ${sqliteFilePath} < ${sqliteSchemaFilePath}`;
            
            execSync(createTableCommand);
            console.log('Tabla expediciones creada en SQLite.');
        } catch (error) {
            console.error('Error al generar o crear la tabla expediciones en SQLite:', error);
        }
    });
}

function deleteSQLiteFile() {
    cron.schedule('30 6 * * *', () => {
        const sqliteFilePath = '/shares/GLS/data/database.db';
        try {
            fs.unlinkSync(sqliteFilePath);
            console.log('Archivo SQLite eliminado.');
        } catch (error) {
            console.error('Error al eliminar el archivo SQLite:', error);
        }
    });
}

module.exports = { createSQLiteTable, deleteSQLiteFile };
