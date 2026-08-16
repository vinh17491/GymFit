import api from '../api/axios';

export const PENDING_PLAN_STORAGE_KEY = 'gymfit_pending_plan_id';

export function getPendingPlanId(): number | null {
  const raw = sessionStorage.getItem(PENDING_PLAN_STORAGE_KEY);
  if (!raw) return null;
  const planId = Number(raw);
  return Number.isSafeInteger(planId) && planId > 0 ? planId : null;
}

export function getPendingPlanCheckoutPath(): string | null {
  const planId = getPendingPlanId();
  return planId === null ? null : `/membership/checkout?plan_id=${encodeURIComponent(String(planId))}`;
}

export function clearPendingPlan(): void {
  sessionStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
}

export type MembershipLifecycle = 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type PlanEntitlementKey = 'COACH_BOOKING_ENABLED' | 'COACH_BOOKING_MONTHLY_LIMIT';
export type PlanEntitlementValueType = 'BOOLEAN' | 'INTEGER' | 'UNLIMITED';

export interface PlanEntitlement {
  id?: number;
  plan_id?: number;
  entitlement_key: PlanEntitlementKey;
  entitlement_value: string;
  value_type: PlanEntitlementValueType;
  created_at?: string;
  updated_at?: string;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  features: string[];
  entitlements: PlanEntitlement[];
  sortOrder: number;
}

interface PlanRaw {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  type: string;
  features: string | string[];
  sort_order: number;
  entitlements?: PlanEntitlement[];
}

interface MembershipRaw {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_id: number | null;
  auto_renew: boolean;
  created_at: string;
  plan?: PlanRaw | null;
}

interface PaymentRaw {
  id: number;
  user_id: number;
  plan_id: number | null;
  amount: number;
  method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
  plan?: PlanRaw | null;
}

export interface MembershipRecord extends Omit<MembershipRaw, 'plan'> {
  plan: Plan | null;
}

export interface MembershipPayment extends Omit<PaymentRaw, 'plan'> {
  plan: Plan | null;
}

export interface MembershipState {
  lifecycle: MembershipLifecycle | null;
  membership: MembershipRecord | null;
  pendingPayment: MembershipPayment | null;
}

export async function getPlans(signal?: AbortSignal): Promise<Plan[]> {
  const { data } = await api.get('/plans', { signal });
  return (data.data as PlanRaw[]).map(mapPlan);
}

function mapPlan(r: PlanRaw): Plan {
  let features: string[] = [];
  if (typeof r.features === 'string') {
    try { features = JSON.parse(r.features); } catch { features = [r.features]; }
  } else if (Array.isArray(r.features)) {
    features = r.features;
  }
  return {
    id: r.id, name: r.name, description: r.description || '',
    price: r.price, durationDays: r.duration_days,
    type: r.type as Plan['type'],
    features,
    entitlements: Array.isArray(r.entitlements) ? r.entitlements : [],
    sortOrder: r.sort_order
  };
}

function mapMembershipState(raw: { lifecycle: MembershipLifecycle | null; membership: MembershipRaw | null; pendingPayment: PaymentRaw | null }): MembershipState {
  return {
    lifecycle: raw.lifecycle,
    membership: raw.membership ? { ...raw.membership, plan: raw.membership.plan ? mapPlan(raw.membership.plan) : null } : null,
    pendingPayment: raw.pendingPayment ? { ...raw.pendingPayment, plan: raw.pendingPayment.plan ? mapPlan(raw.pendingPayment.plan) : null } : null,
  };
}

export async function getMyMembership(signal?: AbortSignal): Promise<MembershipState> {
  const { data } = await api.get('/plans/my-membership', { signal });
  return mapMembershipState(data.data);
}

export async function subscribeToPlan(planId: number): Promise<MembershipState> {
  const { data } = await api.post('/plans/subscribe', { plan_id: planId });
  return mapMembershipState(data.data);
}

export async function confirmMembershipPayment(paymentId: number): Promise<MembershipState> {
  const { data } = await api.post('/plans/subscribe/confirm', { payment_id: paymentId });
  return mapMembershipState(data.data);
}

export async function upgradeMembership(planId: number): Promise<MembershipState> {
  const { data } = await api.post('/plans/upgrade', { plan_id: planId });
  return mapMembershipState(data.data);
}

export async function downgradeMembership(planId: number): Promise<MembershipState> {
  const { data } = await api.post('/plans/downgrade', { plan_id: planId });
  return mapMembershipState(data.data);
}

export async function cancelMembership(): Promise<MembershipState> {
  const { data } = await api.post('/plans/cancel');
  return mapMembershipState(data.data);
}
