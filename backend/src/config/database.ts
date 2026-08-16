import * as sql from 'mssql';
import { config as appConfig } from '../config/config';
import { logger } from '../utils/logger';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  pool = await sql.connect(appConfig.db);
  logger.info('Connected to SQL Server');
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.close(); pool = null; logger.info('DB closed'); }
}

export async function query<T = any>(sqlStr: string, params?: Record<string, any>): Promise<sql.IResult<T>> {
  const p = await getPool();
  const req = p.request();
  if (params) Object.entries(params).forEach(([k, v]) => req.input(k, v));
  return req.query<T>(sqlStr);
}

export async function executeProc<T = any>(name: string, params?: Record<string, any>): Promise<sql.IResult<T>> {
  const p = await getPool();
  const req = p.request();
  if (params) Object.entries(params).forEach(([k, v]) => req.input(k, v));
  return req.execute<T>(name);
}

export { sql };
