/*const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

cron.schedule('0 5 * * *', () => {
    // Comando para convertir el archivo .mdb a SQLite
    const mdbFilePath = '/shares/GLS/data/expediciones.mdb';
    const sqliteFilePath = '/shares/GLS/data/database.db';
    
    // Comando para convertir el archivo .mdb a SQLite usando mdb-tools
    const command = `mdb-export ${mdbFilePath} | sqlite3 ${sqliteFilePath}`;
    
    // Ejecutar el comando
    try {
        execSync(command);
        console.log('Conversión completa: .mdb -> SQLite');
        
        // Eliminar el archivo SQLite después de la conversión
        fs.unlinkSync(sqliteFilePath);
        console.log('Archivo SQLite eliminado.');
    } catch (error) {
        console.error('Error al convertir el archivo .mdb a SQLite:', error);
    }
});

// Programar la eliminación del archivo SQLite a las 6:30 AM
cron.schedule('30 6 * * *', () => {
    const sqliteFilePath = '/shares/GLS/data/database.db';
    try {
        fs.unlinkSync(sqliteFilePath);
        console.log('Archivo SQLite eliminado.');
    } catch (error) {
        console.error('Error al eliminar el archivo SQLite:', error);
    }
});
*/