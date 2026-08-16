import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function validateCoupon(req: Request, _res: Response, next: NextFunction) {
  try {
    const { code, plan_id } = req.body;
    const r = await query(`SELECT * FROM Coupons WHERE code=@code AND is_active=1 AND start_date<=GETDATE() AND end_date>=GETDATE()`, { code });
    if (r.recordset.length === 0) throw new AppError(404, 'Invalid or expired coupon');
    const coupon = r.recordset[0];
    const usage = await query('SELECT COUNT(*) as cnt FROM CouponUsages WHERE coupon_id=@id', { id: coupon.id });
    if (coupon.usage_limit && usage.recordset[0].cnt >= coupon.usage_limit) throw new AppError(400, 'Coupon usage limit reached');
    const userUsage = await query('SELECT COUNT(*) as cnt FROM CouponUsages WHERE coupon_id=@id AND user_id=@uid', { id: coupon.id, uid: req.user!.userId });
    if (userUsage.recordset[0].cnt >= coupon.user_limit) throw new AppError(400, 'You have used this coupon already');
    const plan = await query('SELECT price FROM Plans WHERE id=@pid', { pid: plan_id });
    if (plan.recordset.length === 0) throw new AppError(404, 'Plan not found');
    if (plan.recordset[0].price < coupon.min_purchase) throw new AppError(400, 'Minimum purchase not met');
    const discount = coupon.type === 'percentage' ? plan.recordset[0].price * coupon.value / 100 : coupon.value;
    sendSuccess(_res, { coupon, discount: Math.min(discount, plan.recordset[0].price) });
  } catch (err) { next(err); }
}

export async function createCoupon(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(`INSERT INTO Coupons (code,type,value,min_purchase,start_date,end_date,usage_limit,user_limit,applicable_plans,created_by)
      OUTPUT INSERTED.* VALUES (@code,@type,@value,@min,@start,@end,@ul,@usl,@plans,@uid)`, {
      code: req.body.code, type: req.body.type, value: req.body.value, min: req.body.min_purchase,
      start: req.body.start_date, end: req.body.end_date, ul: req.body.usage_limit || null,
      usl: req.body.user_limit, plans: req.body.applicable_plans || null, uid: req.user!.userId
    });
    sendSuccess(_res, r.recordset[0], 'Coupon created', 201);
  } catch (err) { next(err); }
}

export async function listCoupons(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM Coupons ORDER BY created_at DESC');
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getCouponStats(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(`SELECT c.id, c.code, c.type, c.value, COUNT(cu.id) as used_count FROM Coupons c LEFT JOIN CouponUsages cu ON c.id=cu.coupon_id GROUP BY c.id, c.code, c.type, c.value`);
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}
