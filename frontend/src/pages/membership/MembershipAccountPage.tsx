import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, CreditCard, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { cancelMembership, clearPendingPlan, confirmMembershipPayment, downgradeMembership, getMyMembership, getPendingPlanId, getPlans, type MembershipState, type Plan, subscribeToPlan, upgradeMembership } from '../../services/plans';
import { useAuthStore } from '../../stores/authStore';

function errorMessage(error: unknown): string {
  const response = error as { response?: { data?: { message?: string } } };
  return response.response?.data?.message || (error instanceof Error ? error.message : 'Membership request failed. Please try again.');
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function initialPlanId(search: string): number | null {
  const queryId = Number(new URLSearchParams(search).get('plan_id'));
  if (Number.isInteger(queryId) && queryId > 0) return queryId;
  return getPendingPlanId();
}

export default function MembershipAccountPage() {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [state, setState] = useState<MembershipState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(() => initialPlanId(location.search));
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState('');

  const activeMembership = Boolean(state?.membership && state.membership.status === 'active' && new Date(state.membership.end_date).getTime() > Date.now());
  const currentPlanId = state?.membership?.plan_id ?? null;
  const currentPlan = state?.membership?.plan || null;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [availablePlans, membership] = await Promise.all([getPlans(), getMyMembership()]);
      setPlans(availablePlans);
      setState(membership);
      setSelectedPlanId(current => current ?? initialPlanId(location.search) ?? availablePlans[0]?.id ?? null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [location.search]);

  const applyResult = (result: MembershipState, clearPending = false) => {
    setState(result);
    setError('');
    if (clearPending) clearPendingPlan();
  };

  const runAction = async (label: string, action: () => Promise<MembershipState>, clearPending = false) => {
    setProcessing(label);
    setError('');
    try { applyResult(await action(), clearPending); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setProcessing(''); }
  };

  const startSubscription = () => {
    if (!selectedPlanId) return;
    void runAction('subscribe', () => subscribeToPlan(selectedPlanId), true);
  };

  const confirmPayment = () => {
    const paymentId = state?.pendingPayment?.id;
    if (!paymentId) return;
    void runAction('confirm', () => confirmMembershipPayment(paymentId), true);
  };

  const changePlan = (plan: Plan) => {
    if (state?.pendingPayment || processing) return;
    setSelectedPlanId(plan.id);
    if (!activeMembership) {
      void runAction(`subscribe-${plan.id}`, () => subscribeToPlan(plan.id));
      return;
    }
    if (plan.id === currentPlanId) return;
    if (plan.price > (currentPlan?.price || 0)) void runAction(`upgrade-${plan.id}`, () => upgradeMembership(plan.id));
    else if (plan.price < (currentPlan?.price || 0)) void runAction(`downgrade-${plan.id}`, () => downgradeMembership(plan.id));
  };

  const cancel = () => {
    if (!window.confirm('Cancel your current membership?')) return;
    void runAction('cancel', cancelMembership);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/membership" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} />Back to plans</Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Membership account</h1>
          <p className="mt-1 text-slate-400">Review your membership and confirm simulated payments securely.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-400" disabled={loading || Boolean(processing)}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>

      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-slate-400">Loading membership account…</div>
      ) : (
        <>
          {state?.pendingPayment && (
            <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Pending simulated payment</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{state.pendingPayment.plan?.name || 'Selected plan'}</h2>
                  <p className="mt-1 text-sm text-amber-100/80">{formatPrice(state.pendingPayment.amount)} · {state.pendingPayment.method.replace('SIMULATED_', '').toLowerCase()}</p>
                  {activeMembership && <p className="mt-3 text-sm text-amber-100/80">Your current {currentPlan?.name || 'membership'} remains active until this payment is confirmed.</p>}
                </div>
                <button type="button" onClick={confirmPayment} disabled={Boolean(processing)} className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"><CreditCard size={16} />{processing === 'confirm' ? 'Confirming…' : 'Confirm simulated payment'}</button>
              </div>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current membership</p><h2 className="mt-2 text-xl font-semibold text-white">{currentPlan?.name || 'No active membership'}</h2></div>
                {state?.lifecycle && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.lifecycle === 'ACTIVE' ? 'bg-emerald-400/15 text-emerald-300' : state.lifecycle === 'PENDING_PAYMENT' ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>{state.lifecycle.replace('_', ' ')}</span>}
              </div>
              {state?.membership ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div><p className="text-xs text-slate-500">Started</p><p className="mt-1 text-sm text-slate-200">{formatDate(state.membership.start_date)}</p></div>
                  <div><p className="text-xs text-slate-500">Ends</p><p className="mt-1 text-sm text-slate-200">{formatDate(state.membership.end_date)}</p></div>
                  <div><p className="text-xs text-slate-500">Payment</p><p className="mt-1 text-sm text-slate-200">{state.membership.payment_id ? `#${state.membership.payment_id}` : 'Not confirmed'}</p></div>
                </div>
              ) : <p className="mt-6 text-sm text-slate-400">Choose a plan below to start a simulated checkout. No Membership is activated until confirmation.</p>}
              {activeMembership && <button type="button" onClick={cancel} disabled={Boolean(processing) || Boolean(state?.pendingPayment)} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={16} />{processing === 'cancel' ? 'Cancelling…' : 'Cancel membership'}</button>}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-300" size={22} /><h2 className="text-lg font-semibold text-white">Payment lifecycle</h2></div>
              <ul className="mt-5 space-y-3 text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-300" />A pending payment never grants entitlement.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-300" />Confirmation creates one active Membership atomically.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-emerald-300" />Plan changes preserve the previous record as history.</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Available plans</p><h2 className="mt-2 text-2xl font-semibold text-white">{activeMembership ? 'Change your plan' : 'Choose your plan'}</h2></div><Link to="/membership" className="text-sm text-blue-300 hover:text-blue-200">View plan details</Link></div>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map(plan => {
                const isCurrent = activeMembership && plan.id === currentPlanId;
                const isUpgrade = activeMembership && plan.price > (currentPlan?.price || 0);
                const isDowngrade = activeMembership && plan.price < (currentPlan?.price || 0);
                const actionLabel = isCurrent ? 'Current plan' : isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Subscribe';
                const actionIcon = isUpgrade ? <ArrowUp size={16} /> : isDowngrade ? <ArrowDown size={16} /> : <CreditCard size={16} />;
                return <div key={plan.id} className={`rounded-2xl border p-5 ${plan.id === selectedPlanId ? 'border-blue-400/70 bg-blue-400/10' : 'border-slate-800 bg-slate-900/60'}`}>
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                  <p className="mt-5 text-2xl font-bold text-white">{formatPrice(plan.price)}<span className="ml-1 text-xs font-normal text-slate-500">/ {plan.durationDays} days</span></p>
                  <button type="button" onClick={() => changePlan(plan)} disabled={isCurrent || Boolean(state?.pendingPayment) || Boolean(processing)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{processing.endsWith(`-${plan.id}`) ? 'Processing…' : actionIcon}{actionLabel}</button>
                </div>;
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
