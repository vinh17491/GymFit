import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearPendingPlan, getPlans, type Plan, PENDING_PLAN_STORAGE_KEY } from '../../services/plans';
import { useAuthStore } from '../../stores/authStore';
import Skeleton from '../../components/ui/skeleton';

const iconMap = [Zap, Star, Crown] as const;
const colorMap = ['from-[#64748b] to-[#475569]', 'from-[#2563eb] to-[#0ea5e9]', 'from-[#8b5cf6] to-[#ec4899]'] as const;
const borderMap = ['border-[#1e293b]', 'border-[#2563eb]/50', 'border-[#1e293b]'] as const;

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function coachBookingDisplay(plan: Plan): string {
  const enabled = plan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_ENABLED');
  const limit = plan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_MONTHLY_LIMIT');
  if (enabled?.entitlement_value !== 'true') return 'Not included';
  if (limit?.value_type === 'UNLIMITED' && limit.entitlement_value === '-1') return 'Unlimited';
  const monthlyLimit = Number(limit?.entitlement_value);
  return Number.isInteger(monthlyLimit) && monthlyLimit >= 0 ? `${monthlyLimit} per calendar month` : 'Configured by backend';
}

export default function MembershipPlans() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPlans = () => {
    setLoading(true);
    setError('');
    getPlans().then(setPlans).catch(() => setError('Failed to load plans')).finally(() => setLoading(false));
  };

  useEffect(() => { loadPlans(); }, []);

  const choosePlan = (planId: number) => {
    if (user?.role === 'member') {
      navigate(`/membership/checkout?plan_id=${encodeURIComponent(String(planId))}`);
      return;
    }
    if (user) {
      clearPendingPlan();
      navigate('/access-denied');
      return;
    }
    sessionStorage.setItem(PENDING_PLAN_STORAGE_KEY, String(planId));
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">Choose Your Plan</h1>
          <p className="mx-auto max-w-2xl text-lg text-[#94a3b8]">
            Prices, durations and included features are loaded from the current backend Plan configuration.
          </p>
          {user?.role === 'member' && <Link to="/membership/account" className="mt-5 inline-flex rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#60a5fa] hover:text-white">Manage my membership</Link>}
        </motion.div>

        {loading ? (
          <div className="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="space-y-4 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-8"><Skeleton className="h-14 w-14 rounded-2xl" /><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-28" /><Skeleton className="h-40 w-full" /></div>)}
          </div>
        ) : error ? (
          <div className="py-12 text-center"><p className="mb-4 text-red-400">{error}</p><button type="button" onClick={loadPlans} className="rounded-lg bg-[#2563eb] px-6 py-2 font-medium text-white hover:bg-[#1d4ed8]">Retry</button></div>
        ) : plans.length === 0 ? (
          <div className="py-12 text-center text-[#94a3b8]">No active plans are available.</div>
        ) : (
          <div className="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan, index) => {
              const Icon = iconMap[index % iconMap.length];
              return <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`rounded-2xl border ${borderMap[index % borderMap.length]} bg-[#0f172a]`}>
                <div className="p-8">
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${colorMap[index % colorMap.length]} shadow-lg`}><Icon size={28} className="text-white" /></div>
                  <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                  <p className="mb-6 mt-1 text-sm text-[#94a3b8]">{plan.description}</p>
                  <div className="mb-6"><span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span><span className="text-sm text-[#64748b]"> / {plan.durationDays} days</span></div>
                  <button type="button" onClick={() => choosePlan(plan.id)} className="block w-full rounded-lg bg-[#2563eb] py-3 text-center font-semibold text-white transition hover:bg-[#1d4ed8]">{user?.role === 'member' ? 'Continue to checkout' : 'Choose plan'}</button>
                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature, featureIndex) => <div key={`${plan.id}-${featureIndex}`} className="flex items-start gap-3"><Check size={16} className="mt-0.5 shrink-0 text-[#22c55e]" /><span className="text-sm text-[#94a3b8]">{feature}</span></div>)}
                    <div className="border-t border-[#1e293b] pt-3 text-sm text-[#94a3b8]"><span className="font-medium text-white">Coach booking:</span> {coachBookingDisplay(plan)}</div>
                  </div>
                </div>
              </motion.div>;
            })}
          </div>
        )}

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-16 max-w-4xl rounded-2xl border border-[#1e293b] bg-[#0f172a] p-8">
          <h2 className="mb-6 text-center text-3xl font-bold text-white">How membership activation works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Choose a Plan', 'The selected backend Plan and its real price are sent to checkout.'],
              ['2', 'Start simulated payment', 'The server creates a pending payment; it does not activate Membership yet.'],
              ['3', 'Confirm payment', 'Explicit confirmation activates the Membership for the backend duration.'],
            ].map(([number, title, description]) => <div key={number} className="text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb] font-bold text-white">{number}</div><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm text-[#94a3b8]">{description}</p></div>)}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'How long does a Plan last?', a: 'Each Plan card displays the duration returned by the backend in days.' },
              { q: 'Can I change or cancel my Membership?', a: 'The Membership account supports the backend upgrade, downgrade and cancellation actions. Plan changes use the same explicit simulated-payment confirmation flow.' },
              { q: 'Does choosing a Plan activate it immediately?', a: 'No. Choosing a Plan creates a pending simulated payment. The Membership becomes active only after you confirm it.' },
              { q: 'Are live card, PayPal or free-trial payments connected?', a: 'No live payment gateway or free-trial billing is connected in this build; payment confirmation is explicitly simulated.' },
            ].map((faq, index) => <div key={index} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6"><h3 className="mb-2 font-semibold text-white">{faq.q}</h3><p className="text-sm text-[#94a3b8]">{faq.a}</p></div>)}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
