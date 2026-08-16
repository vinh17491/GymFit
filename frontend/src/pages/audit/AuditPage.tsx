import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function AuditPage() {
  const { data, loading, error, refetch } = useApi<{ logs: any[]; total: number }>('/audit');

  if (loading) return <LoadingSpinner text="Loading audit logs..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const logs = data?.logs || [];
  const columns = [
    { key: 'user_name', header: 'User', render: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-[10px]">{r.user_name?.[0]}</div>
        <span>{r.user_name}</span>
      </div>
    )},
    { key: 'action', header: 'Action', render: (r: any) => <Badge variant="blue">{r.action}</Badge> },
    { key: 'entity_type', header: 'Entity' },
    { key: 'ip', header: 'IP', render: (r: any) => <span className="font-mono text-xs text-dark-400">{r.ip}</span> },
    { key: 'timestamp', header: 'Time', render: (r: any) => <span className="text-sm text-dark-400">{new Date(r.timestamp).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">Audit Log</h1>
        <p className="text-dark-400 mt-1">System activity tracking</p>
      </motion.div>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={logs} emptyTitle="No audit logs" />
      </div>
    </div>
  );
}
