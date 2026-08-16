import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { z } from 'zod';
import { getPoints, getHistory, getRewardsCatalog, redeemReward, loginDailyPoints } from './loyalty.controller';
import { query } from '../../config/database';

const router = Router();
router.get('/points', authenticate, authorize(UserRole.MEMBER), getPoints);
router.get('/history', authenticate, authorize(UserRole.MEMBER), getHistory);
router.get('/rewards', authenticate, getRewardsCatalog);
router.post('/redeem', authenticate, authorize(UserRole.MEMBER), validate(z.object({ reward_id: z.number().int().positive() }).strict()), redeemReward);
router.post('/daily-login', authenticate, authorize(UserRole.MEMBER), loginDailyPoints);
router.post('/add', authenticate, authorize(UserRole.ADMIN), validate(z.object({ user_id: z.number().int().positive(), points: z.number().int().min(-100000).max(100000).refine(v=>v!==0), source: z.string().trim().min(1).max(100) }).strict()), async (req, res, next) => {
  try { await query(`IF NOT EXISTS(SELECT 1 FROM Users WHERE id=@uid AND is_active=1) THROW 50001,'User not found',1;
    IF NOT EXISTS(SELECT 1 FROM Points WHERE user_id=@uid) INSERT Points(user_id,balance,lifetime_earned,lifetime_spent) VALUES(@uid,0,0,0);
    UPDATE Points SET balance=balance+@p,lifetime_earned=lifetime_earned+CASE WHEN @p>0 THEN @p ELSE 0 END,lifetime_spent=lifetime_spent+CASE WHEN @p<0 THEN -@p ELSE 0 END,updated_at=GETDATE() WHERE user_id=@uid AND balance+@p>=0;
    IF @@ROWCOUNT=0 THROW 50002,'Insufficient points',1;
    INSERT PointTransactions(user_id,type,points,source,description) VALUES(@uid,CASE WHEN @p>0 THEN 'earn' ELSE 'spend' END,ABS(@p),@source,'Admin adjustment');`, { p: req.body.points, uid: req.body.user_id, source:req.body.source }); res.json({ success: true, message: 'Points adjusted' }); } catch (e) { next(e); }
});
export default router;
