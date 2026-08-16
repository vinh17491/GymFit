import crypto from 'crypto';
import * as sql from 'mssql';
import { getPool } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export type MembershipLifecycle = 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type MembershipAction = 'SUBSCRIBE' | 'UPGRADE' | 'DOWNGRADE';

interface PlanRow {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  type: string;
  features: string | string[] | null;
  sort_order: number;
  is_active?: boolean;
}

interface MembershipRow {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: Date;
  end_date: Date;
  status: string;
  payment_id: number | null;
  auto_renew: boolean;
  created_at: Date;
  plan_name?: string;
  plan_description?: string | null;
  plan_price?: number;
  plan_duration_days?: number;
  plan_type?: string;
  plan_features?: string | string[] | null;
}

interface PaymentRow {
  id: number;
  user_id: number;
  plan_id: number | null;
  amount: number;
  method: string;
  status: string;
  transaction_id: string | null;
  created_at: Date;
  plan_name?: string;
  plan_description?: string | null;
  plan_price?: number;
  plan_duration_days?: number;
  plan_type?: string;
  plan_features?: string | string[] | null;
}

export interface MembershipState {
  lifecycle: MembershipLifecycle | null;
  membership: ReturnType<typeof serializeMembership> | null;
  pendingPayment: ReturnType<typeof serializePayment> | null;
}

type SqlExecutor = sql.ConnectionPool | sql.Transaction;

function requestFor(executor: SqlExecutor): sql.Request {
  return executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();
}

function parseFeatures(features: string | string[] | null | undefined): string[] {
  if (Array.isArray(features)) return features.map(String);
  if (!features) return [];
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed.map(String) : [String(features)];
  } catch {
    return [String(features)];
  }
}

function serializePlan(row: PlanRow | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    duration_days: Number(row.duration_days),
    type: row.type,
    features: parseFeatures(row.features),
    sort_order: Number(row.sort_order),
  };
}

function planFromMembership(row: MembershipRow): PlanRow | null {
  if (!row.plan_name) return null;
  return {
    id: Number(row.plan_id),
    name: row.plan_name,
    description: row.plan_description ?? null,
    price: Number(row.plan_price ?? 0),
    duration_days: Number(row.plan_duration_days ?? 0),
    type: row.plan_type || '',
    features: row.plan_features ?? null,
    sort_order: 0,
  };
}

function planFromPayment(row: PaymentRow): PlanRow | null {
  if (!row.plan_name || row.plan_id === null) return null;
  return {
    id: Number(row.plan_id),
    name: row.plan_name,
    description: row.plan_description ?? null,
    price: Number(row.plan_price ?? row.amount),
    duration_days: Number(row.plan_duration_days ?? 0),
    type: row.plan_type || '',
    features: row.plan_features ?? null,
    sort_order: 0,
  };
}

function serializeMembership(row: MembershipRow): Record<string, unknown> {
  const plan = serializePlan(planFromMembership(row));
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    plan_id: Number(row.plan_id),
    start_date: row.start_date,
    end_date: row.end_date,
    status: String(row.status).toLowerCase(),
    payment_id: row.payment_id === null ? null : Number(row.payment_id),
    auto_renew: Boolean(row.auto_renew),
    created_at: row.created_at,
    plan,
  };
}

function serializePayment(row: PaymentRow): Record<string, unknown> {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    plan_id: row.plan_id === null ? null : Number(row.plan_id),
    amount: Number(row.amount),
    method: row.method,
    status: String(row.status).toLowerCase(),
    transaction_id: row.transaction_id,
    created_at: row.created_at,
    plan: serializePlan(planFromPayment(row)),
  };
}

function lifecycleForMembership(row: MembershipRow | null): MembershipLifecycle | null {
  if (!row) return null;
  const status = String(row.status).toLowerCase();
  if (status === 'active') return new Date(row.end_date).getTime() > Date.now() ? 'ACTIVE' : 'EXPIRED';
  if (status === 'cancelled') return 'CANCELLED';
  return 'EXPIRED';
}

async function readMembershipState(executor: SqlExecutor, userId: number): Promise<MembershipState> {
  const memberships = (await requestFor(executor)
    .input('userId', sql.Int, userId)
    .query<MembershipRow>(`
      SELECT TOP (20)
        m.id, m.user_id, m.plan_id, m.start_date, m.end_date, m.status, m.payment_id, m.auto_renew, m.created_at,
        p.name AS plan_name, p.description AS plan_description, p.price AS plan_price,
        p.duration_days AS plan_duration_days, p.type AS plan_type, p.features AS plan_features
      FROM dbo.Memberships m
      LEFT JOIN dbo.Plans p ON p.id = m.plan_id
      WHERE m.user_id = @userId
      ORDER BY m.created_at DESC, m.id DESC`)).recordset;

  const pendingPayments = (await requestFor(executor)
    .input('paymentUserId', sql.Int, userId)
    .query<PaymentRow>(`
      SELECT TOP (1)
        pay.id, pay.user_id, pay.plan_id, pay.amount, pay.method, pay.status, pay.transaction_id, pay.created_at,
        p.name AS plan_name, p.description AS plan_description, p.price AS plan_price,
        p.duration_days AS plan_duration_days, p.type AS plan_type, p.features AS plan_features
      FROM dbo.Payments pay
      LEFT JOIN dbo.Plans p ON p.id = pay.plan_id
      WHERE pay.user_id = @paymentUserId AND pay.status = N'pending'
      ORDER BY pay.created_at DESC, pay.id DESC`)).recordset;

  const now = Date.now();
  const active = memberships.find(row => String(row.status).toLowerCase() === 'active' && new Date(row.end_date).getTime() > now) || null;
  const selectedMembership = active || memberships[0] || null;
  const pendingPayment = pendingPayments[0] || null;

  return {
    lifecycle: pendingPayment ? 'PENDING_PAYMENT' : lifecycleForMembership(selectedMembership),
    membership: selectedMembership ? serializeMembership(selectedMembership) : null,
    pendingPayment: pendingPayment ? serializePayment(pendingPayment) : null,
  };
}

async function readMembershipRows(tx: sql.Transaction, userId: number): Promise<MembershipRow[]> {
  return (await new sql.Request(tx)
    .input('userId', sql.Int, userId)
    .query<MembershipRow>(`
      SELECT id, user_id, plan_id, start_date, end_date, status, payment_id, auto_renew, created_at
      FROM dbo.Memberships WITH (UPDLOCK, HOLDLOCK)
      WHERE user_id = @userId
      ORDER BY created_at DESC, id DESC`)).recordset;
}

async function readPendingPayments(tx: sql.Transaction, userId: number): Promise<PaymentRow[]> {
  return (await new sql.Request(tx)
    .input('userId', sql.Int, userId)
    .query<PaymentRow>(`
      SELECT id, user_id, plan_id, amount, method, status, transaction_id, created_at
      FROM dbo.Payments WITH (UPDLOCK, HOLDLOCK)
      WHERE user_id = @userId AND status = N'pending'
      ORDER BY created_at DESC, id DESC`)).recordset;
}

function activeMemberships(rows: MembershipRow[]): MembershipRow[] {
  const now = Date.now();
  return rows.filter(row => String(row.status).toLowerCase() === 'active' && new Date(row.end_date).getTime() > now);
}

function ensureSingleActive(rows: MembershipRow[]): MembershipRow | null {
  const active = activeMemberships(rows);
  if (active.length > 1) throw new AppError(409, 'Membership data has more than one active record', 'MEMBERSHIP_DATA_CONFLICT');
  return active[0] || null;
}

async function readPlan(executor: SqlExecutor, planId: number, activeOnly: boolean): Promise<PlanRow> {
  const result = await requestFor(executor)
    .input('planId', sql.Int, planId)
    .query<PlanRow>(`SELECT id, name, description, price, duration_days, type, features, sort_order, is_active FROM dbo.Plans WHERE id=@planId${activeOnly ? ' AND is_active=1' : ''}`);
  const plan = result.recordset[0];
  if (!plan) throw new AppError(404, 'Plan not found', 'PLAN_NOT_FOUND');
  return plan;
}

async function audit(tx: sql.Transaction, userId: number, action: string, entityType: string, entityId: number | null, oldValue: unknown, newValue: unknown): Promise<void> {
  await new sql.Request(tx)
    .input('userId', sql.Int, userId)
    .input('action', sql.NVarChar(100), action)
    .input('entityType', sql.NVarChar(50), entityType)
    .input('entityId', sql.Int, entityId)
    .input('oldValue', sql.NVarChar(sql.MAX), oldValue === null ? null : JSON.stringify(oldValue))
    .input('newValue', sql.NVarChar(sql.MAX), newValue === null ? null : JSON.stringify(newValue))
    .query(`INSERT dbo.AuditLogs(user_id, action, entity_type, entity_id, old_value, new_value, timestamp)
            VALUES(@userId, @action, @entityType, @entityId, @oldValue, @newValue, SYSUTCDATETIME())`);
}

async function withTransaction<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try { await tx.rollback(); } catch { /* preserve the original failure */ }
    throw error;
  }
}

function methodFor(action: MembershipAction): string {
  return action === 'SUBSCRIBE' ? 'SIMULATED_SUBSCRIPTION' : `SIMULATED_${action}`;
}

async function createPendingPayment(userId: number, planId: number, action: MembershipAction): Promise<MembershipState> {
  return withTransaction(async tx => {
    const memberships = await readMembershipRows(tx, userId);
    const pendingPayments = await readPendingPayments(tx, userId);
    const plan = await readPlan(tx, planId, true);
    const active = ensureSingleActive(memberships);
    if (pendingPayments.length > 0) throw new AppError(409, 'A simulated payment is already pending', 'PAYMENT_ALREADY_PENDING');

    if (action === 'SUBSCRIBE' && active) throw new AppError(409, 'You already have an active membership', 'ACTIVE_MEMBERSHIP_EXISTS');
    if (action !== 'SUBSCRIBE' && !active) throw new AppError(409, 'An active membership is required to change plans', 'ACTIVE_MEMBERSHIP_REQUIRED');

    if (active) {
      const currentPlan = await readPlan(tx, active.plan_id, false);
      const currentPrice = Number(currentPlan.price);
      const targetPrice = Number(plan.price);
      if (action === 'UPGRADE' && targetPrice <= currentPrice) throw new AppError(409, 'The selected plan is not an upgrade', 'INVALID_UPGRADE');
      if (action === 'DOWNGRADE' && targetPrice >= currentPrice) throw new AppError(409, 'The selected plan is not a downgrade', 'INVALID_DOWNGRADE');
    }

    const transactionId = `SIMULATED-PENDING-${crypto.randomUUID()}`;
    const payment = await new sql.Request(tx)
      .input('userId', sql.Int, userId)
      .input('planId', sql.Int, planId)
      .input('amount', sql.Decimal(10, 2), Number(plan.price))
      .input('method', sql.NVarChar(50), methodFor(action))
      .input('transactionId', sql.NVarChar(255), transactionId)
      .query<PaymentRow>(`INSERT dbo.Payments(user_id, plan_id, amount, method, status, transaction_id, created_at)
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.plan_id, INSERTED.amount, INSERTED.method, INSERTED.status, INSERTED.transaction_id, INSERTED.created_at
        VALUES(@userId, @planId, @amount, @method, N'pending', @transactionId, SYSUTCDATETIME())`);
    const paymentId = Number(payment.recordset[0].id);
    await audit(tx, userId, 'membership.payment_pending', 'Payment', paymentId, null, { planId, amount: Number(plan.price), action });
    return readMembershipState(tx, userId);
  });
}

export function startSubscription(userId: number, planId: number): Promise<MembershipState> {
  return createPendingPayment(userId, planId, 'SUBSCRIBE');
}

export function startPlanChange(userId: number, planId: number, action: 'UPGRADE' | 'DOWNGRADE'): Promise<MembershipState> {
  return createPendingPayment(userId, planId, action);
}

export async function confirmPayment(userId: number, paymentId: number): Promise<MembershipState> {
  return withTransaction(async tx => {
    const paymentResult = await new sql.Request(tx)
      .input('paymentId', sql.Int, paymentId)
      .input('userId', sql.Int, userId)
      .query<PaymentRow>(`SELECT TOP (1) id, user_id, plan_id, amount, method, status, transaction_id, created_at
        FROM dbo.Payments WITH (UPDLOCK, HOLDLOCK)
        WHERE id=@paymentId AND user_id=@userId`);
    const payment = paymentResult.recordset[0];
    if (!payment) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');

    if (String(payment.status).toLowerCase() === 'completed') {
      const linked = await new sql.Request(tx)
        .input('completedPaymentId', sql.Int, paymentId)
        .query<{ id: number }>('SELECT TOP (1) id FROM dbo.Memberships WHERE payment_id=@completedPaymentId ORDER BY id DESC');
      if (linked.recordset[0]) return readMembershipState(tx, userId);
      throw new AppError(409, 'Completed payment is not linked to a membership', 'PAYMENT_MEMBERSHIP_CONFLICT');
    }
    if (String(payment.status).toLowerCase() !== 'pending') throw new AppError(409, 'Payment is no longer confirmable', 'PAYMENT_NOT_PENDING');
    if (payment.plan_id === null) throw new AppError(409, 'Payment has no plan', 'PAYMENT_PLAN_MISSING');

    const memberships = await readMembershipRows(tx, userId);
    const plan = await readPlan(tx, Number(payment.plan_id), false);
    const active = ensureSingleActive(memberships);
    const method = String(payment.method);
    const action: MembershipAction = method === 'SIMULATED_UPGRADE' ? 'UPGRADE' : method === 'SIMULATED_DOWNGRADE' ? 'DOWNGRADE' : 'SUBSCRIBE';

    if (action === 'SUBSCRIBE' && active) throw new AppError(409, 'You already have an active membership', 'ACTIVE_MEMBERSHIP_EXISTS');
    if (action !== 'SUBSCRIBE' && !active) throw new AppError(409, 'An active membership is required to change plans', 'ACTIVE_MEMBERSHIP_REQUIRED');
    if (active) {
      const currentPlan = await readPlan(tx, active.plan_id, false);
      const currentPrice = Number(currentPlan.price);
      const targetPrice = Number(plan.price);
      if (action === 'UPGRADE' && targetPrice <= currentPrice) throw new AppError(409, 'The selected plan is not an upgrade', 'INVALID_UPGRADE');
      if (action === 'DOWNGRADE' && targetPrice >= currentPrice) throw new AppError(409, 'The selected plan is not a downgrade', 'INVALID_DOWNGRADE');
    }

    const completedTransactionId = `SIMULATED-COMPLETED-${crypto.randomUUID()}`;
    const paymentUpdate = await new sql.Request(tx)
      .input('paymentIdToComplete', sql.Int, paymentId)
      .input('completedTransactionId', sql.NVarChar(255), completedTransactionId)
      .query(`UPDATE dbo.Payments SET status=N'completed', transaction_id=@completedTransactionId
              WHERE id=@paymentIdToComplete AND status=N'pending'`);
    if (paymentUpdate.rowsAffected[0] !== 1) throw new AppError(409, 'Payment changed while it was being confirmed', 'PAYMENT_CONFIRMATION_CONFLICT');

    if (active) {
      const membershipUpdate = await new sql.Request(tx)
        .input('membershipId', sql.Int, active.id)
        .query(`UPDATE dbo.Memberships SET status=N'cancelled', end_date=SYSUTCDATETIME()
                WHERE id=@membershipId AND status=N'active'`);
      if (membershipUpdate.rowsAffected[0] !== 1) throw new AppError(409, 'Membership changed while the plan change was being confirmed', 'MEMBERSHIP_CONFIRMATION_CONFLICT');
      await audit(tx, userId, 'membership.replaced', 'Membership', active.id, { planId: active.plan_id, status: active.status }, { status: 'cancelled', reason: action });
    }

    const membership = await new sql.Request(tx)
      .input('membershipUserId', sql.Int, userId)
      .input('membershipPlanId', sql.Int, Number(payment.plan_id))
      .input('membershipPaymentId', sql.Int, paymentId)
      .query<MembershipRow>(`INSERT dbo.Memberships(user_id, plan_id, start_date, end_date, status, payment_id, auto_renew, created_at)
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.plan_id, INSERTED.start_date, INSERTED.end_date, INSERTED.status, INSERTED.payment_id, INSERTED.auto_renew, INSERTED.created_at
        SELECT @membershipUserId, @membershipPlanId, SYSUTCDATETIME(), DATEADD(day, p.duration_days, SYSUTCDATETIME()), N'active', @membershipPaymentId, 0, SYSUTCDATETIME()
        FROM dbo.Plans p WHERE p.id=@membershipPlanId`);
    if (!membership.recordset[0]) throw new AppError(409, 'Plan is no longer available for confirmation', 'PLAN_CONFIRMATION_CONFLICT');
    const membershipId = Number(membership.recordset[0].id);
    await audit(tx, userId, 'membership.payment_confirmed', 'Payment', paymentId, { status: 'pending' }, { status: 'completed', membershipId });
    await audit(tx, userId, 'membership.activated', 'Membership', membershipId, null, { planId: Number(payment.plan_id), paymentId, action });
    return readMembershipState(tx, userId);
  });
}

export async function cancelMembership(userId: number): Promise<MembershipState> {
  return withTransaction(async tx => {
    const memberships = await readMembershipRows(tx, userId);
    const active = ensureSingleActive(memberships);
    if (!active) throw new AppError(404, 'No active membership', 'ACTIVE_MEMBERSHIP_NOT_FOUND');

    const pendingPayments = await readPendingPayments(tx, userId);
    const result = await new sql.Request(tx)
      .input('membershipId', sql.Int, active.id)
      .query(`UPDATE dbo.Memberships SET status=N'cancelled', end_date=SYSUTCDATETIME()
              WHERE id=@membershipId AND status=N'active'`);
    if (result.rowsAffected[0] !== 1) throw new AppError(409, 'Membership changed while it was being cancelled', 'MEMBERSHIP_CANCEL_CONFLICT');
    if (pendingPayments.length > 0) {
      await new sql.Request(tx)
        .input('failedUserId', sql.Int, userId)
        .query(`UPDATE dbo.Payments SET status=N'failed' WHERE user_id=@failedUserId AND status=N'pending'`);
    }
    await audit(tx, userId, 'membership.cancelled', 'Membership', active.id, { status: active.status, planId: active.plan_id }, { status: 'cancelled' });
    return readMembershipState(tx, userId);
  });
}

export async function getMembershipState(userId: number): Promise<MembershipState> {
  return readMembershipState(await getPool(), userId);
}
