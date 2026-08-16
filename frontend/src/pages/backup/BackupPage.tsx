import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import Button from '../../components/ui/button';
import { motion } from 'framer-motion';
import { Database, Plus } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function BackupPage() {
  const { data, loading, error, refetch } = useApi<any[]>('/backup');

  const createBackup = async () => {
    try { await api.post('/backup/create'); toast.success('Backup created!'); refetch(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
  };

  if (loading) return <LoadingSpinner text="Loading backups..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const columns = [
    { key: 'type', header: 'Type', render: (r: any) => (
      <Badge variant={r.type === 'daily' ? 'blue' : r.type === 'weekly' ? 'yellow' : 'green'}>{r.type}</Badge>
    )},
    { key: 'status', header: 'Status', render: (r: any) => (
      <Badge variant={r.status === 'completed' ? 'green' : r.status === 'failed' ? 'red' : 'yellow'}>{r.status}</Badge>
    )},
    { key: 'file_size', header: 'Size', render: (r: any) => r.file_size ? <span className="font-mono text-sm">{(r.file_size / 1024 / 1024).toFixed(1)} MB</span> : '-' },
    { key: 'verified', header: 'Verified', render: (r: any) => r.verified ? <Badge variant="green">Verified</Badge> : <Badge variant="yellow">Pending</Badge> },
    { key: 'created_at', header: 'Date', render: (r: any) => <span className="text-sm text-dark-400">{new Date(r.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Backups</h1>
          <p className="text-dark-400 mt-1">Database backups management</p>
        </div>
        <Button onClick={createBackup} icon={<Plus size={16} />}>Create Backup</Button>
      </motion.div>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={data || []} emptyTitle="No backups yet" emptyDescription="Create your first backup to protect your data." />
      </div>
    </div>
  );
}
