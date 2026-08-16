import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import { motion } from 'framer-motion';
import { Tag, Plus } from 'lucide-react';

export default function CouponPage() {
  const { data, loading, error, refetch } = useApi<any[]>('/coupons');

  if (loading) return <LoadingSpinner text="Loading coupons..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const columns = [
    { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-primary-400">{r.code}</span> },
    { key: 'type', header: 'Type', render: (r: any) => <Badge variant="blue">{r.type}</Badge> },
    { key: 'value', header: 'Value', render: (r: any) => r.type === 'percentage' ? <span className="font-medium">{r.value}%</span> : <span className="font-medium">${r.value}</span> },
    { key: 'usage_limit', header: 'Usage Limit', render: (r: any) => r.usage_limit || '∞' },
    { key: 'start_date', header: 'Start', render: (r: any) => new Date(r.start_date).toLocaleDateString() },
    { key: 'end_date', header: 'End', render: (r: any) => new Date(r.end_date).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="text-dark-400 mt-1">Manage discount codes</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Create Coupon</button>
      </motion.div>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={data || []} emptyTitle="No coupons" emptyDescription="Create your first coupon to get started." />
      </div>
    </div>
  );
}
