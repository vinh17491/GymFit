import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function getMyCode(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM ReferralCodes WHERE user_id=@uid', { uid: req.user!.userId });
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function createCode(req: Request, _res: Response, next: NextFunction) {
  try {
    const existing = await query('SELECT id FROM ReferralCodes WHERE user_id=@uid', { uid: req.user!.userId });
    if (existing.recordset.length > 0) throw new AppError(409, 'Referral code already exists');
    const code = (req.user!.email.slice(0, 4).toUpperCase() + crypto.randomBytes(4).toString('hex')).slice(0, 12);
    const r = await query('INSERT INTO ReferralCodes (user_id, code) OUTPUT INSERTED.* VALUES (@uid, @code)', { uid: req.user!.userId, code });
    sendSuccess(_res, r.recordset[0], 'Referral code created', 201);
  } catch (err) { next(err); }
}

export async function getReferrals(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(
      `SELECT rt.*, u.name as referred_name, u.email as referred_email
       FROM ReferralTransactions rt JOIN Users u ON rt.referred_id = u.id
       WHERE rt.referrer_id=@uid ORDER BY rt.created_at DESC`, { uid: req.user!.userId });
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getCommission(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(
      `SELECT SUM(commission_amount) as total, COUNT(*) as count FROM ReferralTransactions
       WHERE referrer_id=@uid AND status='confirmed'`, { uid: req.user!.userId });
    sendSuccess(_res, r.recordset[0]);
  } catch (err) { next(err); }
}

export async function getAll(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(`SELECT rc.*, u.name, u.email FROM ReferralCodes rc JOIN Users u ON rc.user_id = u.id`);
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}
