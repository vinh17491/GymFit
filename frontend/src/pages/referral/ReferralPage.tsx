import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import StatCard from '../../components/shared/StatCard';
import { motion } from 'framer-motion';
import { Copy, DollarSign, Gift, Link2, Share2, Sparkles, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';

export default function ReferralPage() {
  const { data: codeData, loading: l1, error: e1, refetch: r1 } = useApi<any[]>('/referral/my-code');
  const { data: referrals, loading: l2 } = useApi<any[]>('/referral/my-referrals');
  const { data: commission } = useApi<{ total: number; count: number }>('/referral/commission');

  if (l1 || l2) return <LoadingSpinner text="Loading referral data..." />;
  if (e1) return <ErrorState message={e1} onRetry={r1} />;

  const referralCode = codeData?.[0]?.code || 'NONE';
  const referralLink = window.location.origin + '/register?ref=' + referralCode;

  const copyCode = () => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="surface-card relative overflow-hidden bg-gradient-to-br from-lime-300/10 via-slate-900 to-slate-900 p-6 sm:p-8">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-lime-300/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><Sparkles size={21}/></span>
          <h1 className="page-title">Referral Program</h1>
          <p className="page-subtitle max-w-xl">Mời bạn bè tham gia GymFit bằng liên kết cá nhân và theo dõi phần thưởng giới thiệu tại một nơi.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card border-lime-300/25 bg-gradient-to-br from-lime-300/10 to-slate-950">
          <div className="flex items-start justify-between gap-3"><div><span className="text-sm text-slate-400">Mã giới thiệu</span><p className="mt-2 break-all font-mono text-2xl font-bold tracking-wider text-lime-300">{referralCode}</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-300/10 text-lime-300"><Link2 size={17}/></span></div>
        </div>
        <StatCard title="Người đã giới thiệu" value={referrals?.length || 0} icon={<Users size={20} />} subtitle="Tổng lượt ghi nhận" />
        <StatCard title="Hoa hồng đã nhận" value={commission ? `$${Number(commission.total).toFixed(2)}` : '$0'} icon={<DollarSign size={20} />} subtitle={`${commission?.count || 0} giao dịch`} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-card p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-400/10 text-blue-300"><Share2 size={18} /></span><div><h3 className="section-title">Chia sẻ liên kết giới thiệu</h3><p className="mt-1 text-sm text-slate-400">Sao chép liên kết này và gửi trực tiếp cho bạn bè.</p></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input label="Referral link" value={referralLink} readOnly containerClassName="min-w-0 flex-1" className="font-mono text-xs" />
          <Button className="w-full sm:w-auto sm:self-end" onClick={copyCode} icon={<Copy size={16} />}>Sao chép</Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><Gift size={18} /></span><h3 className="section-title">Người dùng được giới thiệu</h3></div>
        {(!referrals || referrals.length === 0) ? (
          <div className="mt-5 grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center"><div><Gift className="mx-auto text-slate-600" size={30}/><p className="mt-3 font-medium text-slate-300">Chưa có lượt giới thiệu</p><p className="mt-1 text-sm text-slate-500">Chia sẻ liên kết phía trên để bắt đầu.</p></div></div>
        ) : (
          <div className="mt-5 space-y-2">
            {referrals.map((r: any) => (
              <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4 transition-colors hover:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{r.referred_name}</p>
                  <p className="truncate text-xs text-slate-500">{r.referred_email}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-emerald-300">+${Number(r.commission_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
