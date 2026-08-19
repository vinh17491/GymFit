import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { query } from './database';

const MIGRATION_PATTERN = /^(\d{4})_(.+)\.sql$/;
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');

interface DiscoveredMigration {
  version: string;
  filename: string;
  checksum: string;
}

interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
}

export type MigrationReadiness = {
  ready: boolean;
  reason: 'READY' | 'MIGRATION_LEDGER_UNAVAILABLE' | 'MIGRATION_PENDING' | 'MIGRATION_CHECKSUM_MISMATCH' | 'MIGRATION_DISCOVERY_FAILED';
  head?: string;
};

async function discoverMigrations(): Promise<DiscoveredMigration[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const migrations: DiscoveredMigration[] = [];
  const versions = new Set<string>();
  for (const entry of entries.filter(item => item.isFile() && item.name.toLowerCase().endsWith('.sql'))) {
    const match = MIGRATION_PATTERN.exec(entry.name);
    if (!match || versions.has(match[1])) throw new Error('invalid migration discovery state');
    versions.add(match[1]);
    const content = await fs.readFile(path.join(MIGRATIONS_DIR, entry.name));
    migrations.push({ version: match[1], filename: entry.name, checksum: createHash('sha256').update(content).digest('hex') });
  }
  return migrations.sort((a, b) => a.filename.localeCompare(b.filename));
}

export async function checkMigrationReadiness(): Promise<MigrationReadiness> {
  let migrations: DiscoveredMigration[];
  try {
    migrations = await discoverMigrations();
  } catch {
    return { ready: false, reason: 'MIGRATION_DISCOVERY_FAILED' };
  }
  const head = migrations[migrations.length - 1]?.version;
  if (!head) return { ready: false, reason: 'MIGRATION_DISCOVERY_FAILED' };

  let applied: AppliedMigration[];
  try {
    applied = (await query<AppliedMigration>(
      'SELECT version, name, checksum FROM dbo.SchemaMigrations ORDER BY version',
    )).recordset;
  } catch {
    return { ready: false, reason: 'MIGRATION_LEDGER_UNAVAILABLE', head };
  }

  const appliedByVersion = new Map(applied.map(item => [item.version, item]));
  for (const migration of migrations) {
    const entry = appliedByVersion.get(migration.version);
    if (!entry) return { ready: false, reason: 'MIGRATION_PENDING', head };
    if (entry.name !== migration.filename || entry.checksum !== migration.checksum) {
      return { ready: false, reason: 'MIGRATION_CHECKSUM_MISMATCH', head };
    }
  }
  if (applied.some(entry => !migrations.some(migration => migration.version === entry.version))) {
    return { ready: false, reason: 'MIGRATION_CHECKSUM_MISMATCH', head };
  }
  return { ready: true, reason: 'READY', head };
}
