import sql from "mssql";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testConnection() {
  try {
    const sqlConfig: sql.config = {
      server: process.env.DB_HOST || "DESKTOP-0PI1Q6Q",
      database: process.env.DB_NAME || "GymFit",
      port: Number(process.env.DB_PORT) || 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      authentication: {
        type: "default",
        options: {},
      },
    };

    console.log("🔄 Connecting to SQL Server...");
    const pool = await sql.connect(sqlConfig);
    console.log("✅ SQL Server connected successfully!");

    const result = await pool.request().query(`
      SELECT COUNT(*) AS total FROM Users;
    `);
    console.log(`👥 Users count: ${result.recordset[0].total}`);

    const result2 = await pool.request().query(`
      SELECT COUNT(*) AS total FROM Roles;
    `);
    console.log(`🔑 Roles count: ${result2.recordset[0].total}`);

    const result3 = await pool.request().query(`
      SELECT COUNT(*) AS total FROM MembershipPlans;
    `);
    console.log(`🏋️ MembershipPlans count: ${result3.recordset[0].total}`);

    await pool.close();
    console.log("🔒 Connection closed.");
  } catch (error) {
    console.error("❌ SQL Server connection failed:");
    console.error(error);
  }
}

testConnection();