import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import Button from '../../components/ui/button';
import { motion } from 'framer-motion';
import { Star, Gift, History, Zap, Sparkles, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function LoyaltyPage() {
  const { data: points, loading, error, refetch } = useApi<any>('/loyalty/points');
  const { data: history } = useApi<any[]>('/loyalty/history');
  const { data: rewards } = useApi<any[]>('/loyalty/rewards');

  const claimDaily = async () => {
    try { await api.post('/loyalty/daily-login'); toast.success('+10 points claimed!'); refetch(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Already claimed today'); }
  };

  const redeem = async (rewardId: number) => {
    try { await api.post('/loyalty/redeem', { reward_id: rewardId }); toast.success('Reward redeemed!'); refetch(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Redeem failed'); }
  };

  if (loading) return <LoadingSpinner text="Loading loyalty data..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">Loyalty Points</h1>
        <p className="text-dark-400 mt-1">Earn points, unlock rewards</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card col-span-1 md:col-span-2 bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border-yellow-600/20">
          <div className="flex items-center gap-2 mb-2"><Sparkles size={18} className="text-yellow-400" /><span className="text-sm text-dark-400">Balance</span></div>
          <p className="text-4xl font-bold text-yellow-400">{points?.balance || 0} pts</p>
        </div>
        <div className="stat-card"><span className="text-sm text-dark-400">Lifetime Earned</span><p className="text-2xl font-bold mt-1">{points?.lifetime_earned || 0}</p></div>
        <div className="stat-card"><span className="text-sm text-dark-400">Lifetime Spent</span><p className="text-2xl font-bold mt-1">{points?.lifetime_spent || 0}</p></div>
      </motion.div>

      <div className="flex gap-3">
        <Button onClick={claimDaily} icon={<Zap size={16} />}>Claim Daily Login (+10 pts)</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <h3 className="section-title flex items-center gap-2"><Award size={18} className="text-yellow-400" /> Rewards Catalog</h3>
          {(!rewards || rewards.length === 0) ? (
            <div className="py-8 text-center text-dark-500">No rewards available</div>
          ) : (
            <div className="space-y-2 mt-3">
              {rewards.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-dark-500">{r.description}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => redeem(r.id)}>{r.points_cost} pts</Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
          <h3 className="section-title flex items-center gap-2"><History size={18} /> Transaction History</h3>
          {(!history || history.length === 0) ? (
            <div className="py-8 text-center text-dark-500">No history yet</div>
          ) : (
            <div className="space-y-1 mt-3">
              {history.slice(0, 15).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-dark-800/50 transition-colors">
                  <div>
                    <p className="text-sm">{h.description || h.source}</p>
                    <p className="text-xs text-dark-500">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-bold ${h.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                    {h.type === 'earn' ? '+' : '-'}{h.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
