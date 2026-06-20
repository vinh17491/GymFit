/**
 * GymFit Migration Runner
 * Runs SQL migration files from backend/src/migrations/ in order.
 * Usage: npx ts-node src/scripts/migrate.ts
 */
import sql from "mssql";
import { getPool } from "../config/database";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

interface MigrationRecord {
  Id: number;
  Name: string;
  AppliedAt: Date;
}

async function ensureMigrationsTable(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[__Migrations]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[__Migrations] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [Name]      NVARCHAR(255) NOT NULL,
        [AppliedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Migrations_AppliedAt] DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Migrations] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UQ_Migrations_Name] UNIQUE ([Name])
      );
    END
  `);
}

async function getAppliedMigrations(pool: sql.ConnectionPool): Promise<string[]> {
  const result = await pool.request().query<MigrationRecord>(
    "SELECT Name FROM [dbo].[__Migrations] ORDER BY Id"
  );
  return result.recordset.map((r) => r.Name);
}

async function runMigrations(): Promise<void> {
  console.log("🚀 GymFit Migration Runner\n");

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    console.log("📁 Created migrations directory:", MIGRATIONS_DIR);
  }

  const pool = await getPool();
  await ensureMigrationsTable(pool);

  const applied = await getAppliedMigrations(pool);
  console.log(`📋 Applied migrations: ${applied.length}`);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    console.log("✅ No pending migrations.");
    return;
  }

  console.log(`⏳ Pending migrations: ${pending.length}\n`);

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sqlContent = fs.readFileSync(filePath, "utf-8");

    console.log(`▶️  Running: ${file}`);
    try {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        await new sql.Request(transaction).batch(sqlContent);
        await new sql.Request(transaction).query(
          `INSERT INTO [dbo].[__Migrations] ([Name]) VALUES (N'${file.replace(/'/g, "''")}')`
        );
        await transaction.commit();
        console.log(`   ✅ Done: ${file}`);
      } catch (err) {
        await transaction.rollback();
        console.error(`   ❌ FAILED: ${file}`, err);
        process.exit(1);
      }
    } catch (err) {
      console.error(`   ❌ ERROR: ${file}`, err);
      process.exit(1);
    }
  }

  console.log(`\n🎉 All ${pending.length} migration(s) applied successfully.`);
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("❌ Migration runner failed:", err);
  process.exit(1);
});