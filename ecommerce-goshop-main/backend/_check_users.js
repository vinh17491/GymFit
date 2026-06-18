const sql = require('mssql');
require('dotenv').config();
const dbCfg = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'GymFit',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '1',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { trustServerCertificate: true, encrypt: false }
};
async function main() {
  const pool = await sql.connect(dbCfg);
  // First get actual columns
  const cols = await pool.request().query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' ORDER BY ORDINAL_POSITION"
  );
  console.log('Users columns:', cols.recordset.map(r => r.COLUMN_NAME));
  const r = await pool.request().query('SELECT TOP 10 * FROM Users ORDER BY Id');
  console.log(JSON.stringify(r.recordset, null, 2));
  await pool.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });