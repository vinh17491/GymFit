const sql = require('mssql');
const cfg = {server:'DESKTOP-0PI1Q6Q',database:'GymFitDB',user:'sa',password:'1',port:1433,options:{encrypt:false,trustServerCertificate:true}};
sql.connect(cfg).then(()=>sql.query`SELECT TOP 5 Id,FullName,Email FROM Users`).then(r=>{console.log(JSON.stringify(r.recordset,null,2));process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)});
