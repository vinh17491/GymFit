const sql = require('mssql');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
(async()=>{
  try {
    const pw = process.env.DB_PASSWORD;
    await sql.connect({
      server: process.env.DB_HOST||'DESKTOP-0PI1Q6Q',
      port: Number(process.env.DB_PORT)||1433,
      database: process.env.DB_NAME||'GymFit',
      user: process.env.DB_USER||'sa',
      password: pw,
      options: {encrypt: false, trustServerCertificate: true}
    });
    console.log('CONNECT_OK');
    const r = await sql.query('SELECT DB_NAME() AS db');
    console.log('DB:', r.recordset[0].db);
    process.exit(0);
  } catch(e) {
    console.log('ERR:' + e.message.substring(0,200));
    process.exit(1);
  }
})();
