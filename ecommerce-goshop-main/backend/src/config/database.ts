import sql, { config as SqlConfig } from "mssql";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const sqlConfig: SqlConfig = {
  server: process.env.DB_HOST || "DESKTOP-0PI1Q6Q",
  database: process.env.DB_NAME || "GymFit",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "1",
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  pool = await sql.connect(sqlConfig);
  console.log("✅ SQL Server connected successfully");
  return pool;
}

export async function closePool(): Promise<void> {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("🔒 SQL Server connection closed");
    }
  } catch (error) {
    console.error("❌ Error closing SQL Server connection:", error);
    throw error;
  }
}

export default sql;