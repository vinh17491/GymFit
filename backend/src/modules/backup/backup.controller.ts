import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { config } from '../../config/config';
import fs from 'fs';
import path from 'path';

export async function createBackup(req: Request, _res: Response, next: NextFunction) {
  try {
    const type = req.body.type || 'manual';
    const backupDir = config.backup.dir;
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const filename = 'gymer_backup_' + type + '_' + new Date().toISOString().slice(0,10) + '_' + Date.now() + '.bak';
    const filepath = path.join(backupDir, filename);
    const sqlCmd = "BACKUP DATABASE [" + config.db.database + "] TO DISK=N'" + filepath + "' WITH INIT, COMPRESSION";
    await query(sqlCmd);
    const stats = fs.statSync(filepath);
    await query("INSERT INTO BackupLogs (type, status, file_path, file_size, duration_seconds, verified, created_by) OUTPUT INSERTED.* VALUES (@type, 'completed', @fp, @fs, 0, 1, @uid)", { type, fp: filepath, fs: stats.size, uid: req.user!.userId });
    sendSuccess(_res, { id: filename, size: stats.size }, 'Backup created successfully');
  } catch (err) { next(err); }
}

export async function listBackups(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM BackupLogs ORDER BY created_at DESC');
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function restoreBackup(req: Request, _res: Response, next: NextFunction) {
  try {
    const backup = await query('SELECT * FROM BackupLogs WHERE id=@id', { id: req.params.id });
    if (backup.recordset.length === 0) throw new AppError(404, 'Backup not found');
    const backupRoot=path.resolve(config.backup.dir);const filepath=path.resolve(String(backup.recordset[0].file_path));
    if(!filepath.startsWith(backupRoot+path.sep)||path.extname(filepath).toLowerCase()!=='.bak'||!fs.existsSync(filepath))throw new AppError(400,'Invalid backup file');
    await query("ALTER DATABASE [" + config.db.database + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE");
    try {
      await query("RESTORE DATABASE [" + config.db.database + "] FROM DISK=N'" + filepath + "' WITH REPLACE");
    } finally {
      await query("ALTER DATABASE [" + config.db.database + "] SET MULTI_USER");
    }
    sendSuccess(_res, null, 'Database restored successfully');
  } catch (err) { next(err); }
}
