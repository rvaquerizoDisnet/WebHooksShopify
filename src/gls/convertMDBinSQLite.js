// Archivo de definición de la tabla expediciones en formato SQL
const sqliteSchemaFilePath = '/shares/GLS/data/expediciones_schema.sql';

// Programar la creación de la tabla SQLite basada en la estructura de la tabla "expediciones" del archivo .mdb
cron.schedule('45 9 * * *', () => {
    const mdbFilePath = '/shares/GLS/data/expediciones.mdb';
    const sqliteFilePath = '/shares/GLS/data/database.db';
    
    // Comando para generar el esquema SQL de la tabla "expediciones"
    const schemaCommand = `mdb-schema ${mdbFilePath} sqlite > ${sqliteSchemaFilePath}`;
    
    try {
        // Ejecutar el comando para generar el esquema SQL
        execSync(schemaCommand);
        console.log('Esquema de tabla expediciones generado.');
        
        // Comando para crear la tabla en SQLite utilizando el esquema SQL generado
        const createTableCommand = `sqlite3 ${sqliteFilePath} < ${sqliteSchemaFilePath}`;
        
        // Ejecutar el comando para crear la tabla en SQLite
        execSync(createTableCommand);
        console.log('Tabla expediciones creada en SQLite.');
    } catch (error) {
        console.error('Error al generar o crear la tabla expediciones en SQLite:', error);
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
