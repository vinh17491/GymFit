import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getPool, query, sql } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getMyCode(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT id,code,status,created_at FROM dbo.ReferralCodes WHERE user_id=@uid ORDER BY id', { uid: req.user!.userId });
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function createCode(req: Request, _res: Response, next: NextFunction) {
  const tx = (await getPool()).transaction();
  let complete = false;
  try {
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const user = await new sql.Request(tx).input('uid', sql.Int, req.user!.userId).query<{ id: number; email: string; referral_code: string | null }>(
      'SELECT id,email,referral_code FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@uid AND is_active=1',
    );
    if (!user.recordset[0]) throw new AppError(404, 'User not found');
    const currentUser = user.recordset[0];
    const existing = await new sql.Request(tx).input('uid', sql.Int, currentUser.id).query<{ id: number; code: string; status: string; created_at: Date }>(
      'SELECT TOP (1) id,code,status,created_at FROM dbo.ReferralCodes WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@uid ORDER BY id',
    );
    if (existing.recordset[0]) {
      if (!currentUser.referral_code && existing.recordset[0].code.length <= 10) {
        await new sql.Request(tx).input('uid', sql.Int, currentUser.id).input('code', sql.NVarChar(10), existing.recordset[0].code)
          .query('UPDATE dbo.Users SET referral_code=@code,updated_at=SYSUTCDATETIME() WHERE id=@uid AND referral_code IS NULL');
      }
      await tx.commit(); complete = true;
      sendSuccess(_res, existing.recordset[0], 'Referral code already exists');
      return;
    }

    const alias = currentUser.referral_code?.trim() || null;
    if (alias && (alias.length < 3 || alias.length > 10)) {
      throw new AppError(409, 'Existing referral alias requires manual review before a canonical code can be created', 'REFERRAL_CODE_REQUIRES_REVIEW');
    }
    const code = alias || (currentUser.email.slice(0, 4).toUpperCase() + crypto.randomBytes(3).toString('hex')).slice(0, 10);
    const r = await new sql.Request(tx).input('uid', sql.Int, currentUser.id).input('code', sql.NVarChar(20), code)
      .query('INSERT dbo.ReferralCodes(user_id,code,status,created_at) OUTPUT INSERTED.* VALUES(@uid,@code,N\'active\',SYSUTCDATETIME())');
    if (!alias) {
      await new sql.Request(tx).input('uid', sql.Int, currentUser.id).input('code', sql.NVarChar(10), code)
        .query('UPDATE dbo.Users SET referral_code=@code,updated_at=SYSUTCDATETIME() WHERE id=@uid AND referral_code IS NULL');
    }
    await tx.commit(); complete = true;
    sendSuccess(_res, r.recordset[0], 'Referral code created', 201);
  } catch (err) {
    if (!complete) try { await tx.rollback(); } catch { /* preserve original error */ }
    if ([2601, 2627].includes(Number((err as { number?: number }).number))) return next(new AppError(409, 'Referral code conflicts with existing data', 'REFERRAL_CODE_REQUIRES_REVIEW'));
    next(err);
  }
}

export async function getReferrals(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(
      `SELECT rt.id, rt.commission_amount, rt.transaction_type, rt.status, rt.created_at,
              u.name as referred_name
        FROM dbo.ReferralTransactions rt JOIN dbo.Users u ON rt.referred_id = u.id
       WHERE rt.referrer_id=@uid ORDER BY rt.created_at DESC`, { uid: req.user!.userId });
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getCommission(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(
      `SELECT SUM(commission_amount) as total, COUNT(*) as count FROM dbo.ReferralTransactions
       WHERE referrer_id=@uid AND status='confirmed'`, { uid: req.user!.userId });
    sendSuccess(_res, r.recordset[0]);
  } catch (err) { next(err); }
}

export async function getAll(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(`SELECT rc.*, u.name, u.email FROM dbo.ReferralCodes rc JOIN dbo.Users u ON rc.user_id = u.id`);
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}
