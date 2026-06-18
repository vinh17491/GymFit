const sql = require('mssql');
const cfg = {
  user: 'sa', password: '1', server: 'DESKTOP-0PI1Q6Q', database: 'GymFit',
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = await new sql.ConnectionPool(cfg).connect();
  
  // Check existing coaches
  const coaches = await pool.request().query('SELECT Id, UserId FROM Coaches');
  console.log('Existing coaches:', JSON.stringify(coaches.recordset));
  
  // Ensure userId=2 (coach1@gmail.com) has a coach record
  const hasCoach2 = coaches.recordset.find(c => c.UserId === 2);
  if (!hasCoach2) {
    console.log('No coach record for userId=2. Inserting...');
    await pool.request()
      .input('userId', sql.Int, 2)
      .query('INSERT INTO Coaches (UserId) VALUES (@userId)');
    console.log('Coach record inserted for userId=2.');
  } else {
    console.log('Coach record exists for userId=2:', hasCoach2);
  }
  
  const updated = await pool.request().query('SELECT Id, UserId FROM Coaches');
  console.log('All coaches:', JSON.stringify(updated.recordset));
  
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
