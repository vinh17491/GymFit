import { useApi } from '../../hooks/useApi';
import StatCard from '../../components/shared/StatCard';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Users, Percent } from 'lucide-react';

export default function RevenuePage() {
  const { data, loading, error, refetch } = useApi<any>('/revenue/dashboard');

  if (loading) return <LoadingSpinner text="Loading revenue data..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">Revenue Dashboard</h1>
        <p className="text-dark-400 mt-1">Financial overview</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={data ? `$${Number(data.totalRevenue || 0).toLocaleString()}` : '$0'} icon={<DollarSign size={20} />} />
        <StatCard title="Monthly Revenue" value={data ? `$${Number(data.monthlyRevenue || 0).toLocaleString()}` : '$0'} icon={<TrendingUp size={20} />} />
        <StatCard title="Active Subscriptions" value={data?.activeSubscriptions || 0} icon={<Users size={20} />} />
        <StatCard title="Churn Rate" value={data ? `${data.churnRate || 0}%` : '0%'} icon={<Percent size={20} />} />
      </motion.div>
    </div>
  );
}
