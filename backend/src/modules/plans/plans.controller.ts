import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as membershipService from './plans.service';
import { listPlanEntitlements, replacePlanEntitlements } from './entitlements.service';

export async function getPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query('SELECT id, name, description, price, duration_days, type, features, sort_order FROM Plans WHERE is_active = 1 ORDER BY sort_order');
    const entitlements = await listPlanEntitlements(result.recordset.map((plan) => Number(plan.id)));
    sendSuccess(res, result.recordset.map((plan) => ({
      ...plan,
      entitlements: entitlements.get(Number(plan.id)) || [],
    })));
  } catch (err) { next(err); }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, price, duration_days, type, features, sort_order, entitlements } = req.body;
    const result = await query(
      `INSERT INTO Plans (name, description, price, duration_days, type, features, sort_order, is_active)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.price, INSERTED.duration_days, INSERTED.type, INSERTED.features, INSERTED.sort_order, INSERTED.is_active
       VALUES (@name, @description, @price, @duration_days, @type, @features, @sort_order, 1)`,
      { name, description, price, duration_days, type, features: JSON.stringify(features || []), sort_order: sort_order || 99 }
    );
    const plan = result.recordset[0];
    const planEntitlements = entitlements === undefined ? [] : await replacePlanEntitlements(Number(plan.id), entitlements);
    sendSuccess(res, { ...plan, entitlements: planEntitlements }, 'Plan created', 201);
  } catch (err) { next(err); }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, price, duration_days, type, features, sort_order, is_active, entitlements } = req.body;
    const result = await query(
      `UPDATE Plans SET name=@name, description=@description, price=@price, duration_days=@duration_days, type=@type, features=@features, sort_order=@sort_order, is_active=@is_active
       OUTPUT INSERTED.*
       WHERE id=@id`,
      { id, name, description, price, duration_days, type, features: JSON.stringify(features), sort_order, is_active }
    );
    if (result.recordset.length === 0) throw new AppError(404, 'Plan not found');
    const plan = result.recordset[0];
    const planEntitlements = entitlements === undefined
      ? await listPlanEntitlements([Number(plan.id)]).then((groups) => groups.get(Number(plan.id)) || [])
      : await replacePlanEntitlements(Number(plan.id), entitlements);
    sendSuccess(res, { ...plan, entitlements: planEntitlements }, 'Plan updated');
  } catch (err) { next(err); }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM Plans WHERE id=@id', { id });
    if (result.rowsAffected[0] === 0) throw new AppError(404, 'Plan not found');
    sendSuccess(res, null, 'Plan deleted');
  } catch (err) { next(err); }
}

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await membershipService.startSubscription(req.user!.userId, req.body.plan_id);
    sendSuccess(res, state, 'Simulated payment created; confirmation is required', 201);
  } catch (err) { next(err); }
}

export async function confirmSubscriptionPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await membershipService.confirmPayment(req.user!.userId, req.body.payment_id);
    sendSuccess(res, state, 'Simulated payment confirmed');
  } catch (err) { next(err); }
}

export async function upgradeMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await membershipService.startPlanChange(req.user!.userId, req.body.plan_id, 'UPGRADE');
    sendSuccess(res, state, 'Simulated upgrade payment created; confirmation is required', 201);
  } catch (err) { next(err); }
}

export async function downgradeMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await membershipService.startPlanChange(req.user!.userId, req.body.plan_id, 'DOWNGRADE');
    sendSuccess(res, state, 'Simulated downgrade payment created; confirmation is required', 201);
  } catch (err) { next(err); }
}

export async function cancelMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await membershipService.cancelMembership(req.user!.userId);
    sendSuccess(res, state, 'Membership cancelled');
  } catch (err) { next(err); }
}

export async function getMyMembership(req: Request, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await membershipService.getMembershipState(req.user!.userId));
  } catch (err) { next(err); }
}
