/**
 * GymFit Database Backup Script
 * Creates a .bak file via SQL Server BACKUP DATABASE.
 * Usage: npx ts-node src/scripts/backup.ts [customFolder]
 * Requires SQL Server sysadmin or BACKUP DATABASE permission.
 */
import { getPool } from "../config/database";
import path from "path";
import fs from "fs";

async function backupDatabase(): Promise<void> {
  const customFolder = process.argv[2];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `GymFit_${timestamp}.bak`;
  const backupDir = customFolder || path.resolve(__dirname, "../../backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, filename);
  const pool = await getPool();

  console.log(`📦 Starting backup: ${filename}`);
  console.log(`📁 Path: ${backupPath}`);

  const request = pool.request();
  await request.query(`
    BACKUP DATABASE [${process.env.DB_NAME || "GymFit"}]
    TO DISK = N'${backupPath.replace(/\\/g, "\\\\")}'
    WITH FORMAT, COMPRESSION,
    NAME = N'GymFit Backup - ${timestamp}',
    STATS = 10;
  `);

  const stats = fs.statSync(backupPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ Backup complete: ${filename} (${sizeMB} MB)`);
  process.exit(0);
}

backupDatabase().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});