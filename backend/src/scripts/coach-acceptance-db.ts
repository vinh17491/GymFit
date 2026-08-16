import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as sql from 'mssql';
import { config } from '../config/config';

const requestedPrefix = process.env.COACH_DB_PREFIX || 'GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_';
const allowedPrefixes = ['GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_', 'GYMFIT_DB_COACH_ACCEPTANCE_', 'GYMFIT_DB_COACH_E2E_FIX_', 'GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_', 'GYMFIT_DB_COACH_ACCEPTANCE_PHASE28_', 'GYMFIT_DB_COACH_FINAL_CLOSURE_'];
if (!allowedPrefixes.includes(requestedPrefix)) throw new Error(`Unsupported Coach acceptance database prefix: ${requestedPrefix}`);
const prefix = requestedPrefix;
const target = config.db.database;
if (process.env.COACH_BOOKING_ACCEPTANCE !== '1') throw new Error('COACH_BOOKING_ACCEPTANCE=1 is required');
if (target === 'GYMFIT_DB' || !target.startsWith(prefix) || !/^[A-Za-z0-9_]+$/.test(target)) {
  throw new Error(`Unsafe Coach acceptance database name: ${target}`);
}

function batches(source: string): string[] {
  const output: string[] = [];
  let current: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*GO\s*$/i.test(line)) {
      const batch = current.join('\n').trim();
      if (batch) output.push(batch);
      current = [];
    } else current.push(line);
  }
  const finalBatch = current.join('\n').trim();
  if (finalBatch) output.push(finalBatch);
  return output;
}

async function recreateDatabase(): Promise<void> {
  const master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
  try {
    await master.request().batch(`IF DB_ID(N'${target}') IS NOT NULL BEGIN ALTER DATABASE [${target}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${target}]; END; CREATE DATABASE [${target}];`);
  } finally {
    await master.close();
  }

  const schema = await fs.readFile(path.resolve(__dirname, '../../../db/schema.sql'), 'utf8');
  const marker = /USE\s+GYMFIT_DB\s*;\s*\r?\nGO\s*\r?\n/i.exec(schema);
  if (!marker) throw new Error('Schema database marker not found');
  const body = schema.slice(marker.index + marker[0].length);
  const pool = await new sql.ConnectionPool({ ...config.db, database: target }).connect();
  try {
    for (const batch of batches(body)) await pool.request().batch(batch);
    // schema.sql contains the profile table for local development. Remove it so
    // the Coach migrations are proven against the pre-migration shape in this DB only.
    await pool.request().batch('DROP TABLE IF EXISTS dbo.CoachProfiles;');
    // The checked-in schema predates the Coach acceptance runtime's auth/workout
    // tables. Apply those Coach-owned migrations to make the isolated DB a real
    // runtime target while keeping their migration records canonical below.
    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    for (const version of ['0006', '0007', '0008', '0009']) {
      const filename = (await fs.readdir(migrationDir)).find(file => file.startsWith(`${version}_`) && file.endsWith('.sql'));
      if (!filename) throw new Error(`Missing migration ${version}`);
      for (const batch of batches(await fs.readFile(path.join(migrationDir, filename), 'utf8'))) await pool.request().batch(batch);
    }
    await pool.request().batch(`
      CREATE TABLE dbo.SchemaMigrations (
        version NVARCHAR(20) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME2 NOT NULL
      );`);

    const entries = (await fs.readdir(migrationDir)).filter(file => /^\d{4}_.+\.sql$/i.test(file)).sort();
    for (const filename of entries) {
      const version = filename.slice(0, 4);
      // Keep all Coach migrations pending for the normal migration runner. The
      // foundation schema and 0006-0009 setup above are intentionally recorded;
      // 0010+ must be applied so new Coach tables are actually created.
      if (version >= '0010' && version < '0100') continue;
      const checksum = createHash('sha256').update(await fs.readFile(path.join(migrationDir, filename))).digest('hex');
      await pool.request()
        .input('version', sql.NVarChar(20), version)
        .input('name', sql.NVarChar(255), filename)
        .input('checksum', sql.Char(64), checksum)
        .query('INSERT dbo.SchemaMigrations(version,name,checksum,applied_at) VALUES(@version,@name,@checksum,SYSUTCDATETIME())');
    }
    const state = await pool.request().query<{ database_name: string; coach_profiles: number; migrations: number }>(
      `SELECT DB_NAME() AS database_name,
              CASE WHEN OBJECT_ID(N'dbo.CoachProfiles',N'U') IS NULL THEN 0 ELSE 1 END AS coach_profiles,
              (SELECT COUNT(*) FROM dbo.SchemaMigrations) AS migrations`,
    );
    console.log(`[COACH ACCEPTANCE DB READY] ${JSON.stringify(state.recordset[0])}`);
  } finally {
    await pool.close();
  }
}

async function dropDatabase(): Promise<void> {
  const master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
  try {
    await master.request().batch(`IF DB_ID(N'${target}') IS NOT NULL BEGIN ALTER DATABASE [${target}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${target}]; END`);
    console.log(`[COACH ACCEPTANCE DB DROPPED] ${target}`);
  } finally {
    await master.close();
  }
}

async function main(): Promise<void> {
  const action = process.argv[2] ?? 'setup';
  if (action === 'setup') await recreateDatabase();
  else if (action === 'drop') await dropDatabase();
  else throw new Error('Expected setup or drop');
}

main().catch(error => {
  console.error('[COACH ACCEPTANCE DB FAIL]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
