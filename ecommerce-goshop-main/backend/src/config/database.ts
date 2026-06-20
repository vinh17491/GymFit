import sql, { config as SqlConfig } from "mssql";
import dotenv from "dotenv";
import path from "path";
import { logger } from "./logger";

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
    max: Number(process.env.DB_POOL_MAX) || 50,
    min: Number(process.env.DB_POOL_MIN) || 5,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  pool = await sql.connect(sqlConfig);
  logger.info("SQL Server connected successfully", {
    server: sqlConfig.server,
    database: sqlConfig.database,
    port: sqlConfig.port,
    poolMin: sqlConfig.pool?.min,
    poolMax: sqlConfig.pool?.max,
  });
  return pool;
}

export async function closePool(): Promise<void> {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info("SQL Server connection closed");
    }
  } catch (error) {
    logger.error("Error closing SQL Server connection:", error);
    throw error;
  }
}

/** Returns pool statistics for health checks */
export function getPoolStats(): { connected: boolean; size?: number; available?: number; pending?: number } {
  if (!pool) return { connected: false };
  return {
    connected: true,
    size: pool.size,
    available: pool.available,
    pending: pool.pending,
  };
}

export default sql;
