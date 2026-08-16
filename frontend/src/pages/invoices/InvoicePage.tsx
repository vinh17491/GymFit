import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';

export default function InvoicePage() {
  const { data, loading, error, refetch } = useApi<any[]>('/invoices');

  if (loading) return <LoadingSpinner text="Loading invoices..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const columns = [
    { key: 'invoice_number', header: 'Invoice #', render: (r: any) => <span className="font-mono text-primary-400">{r.invoice_number}</span> },
    { key: 'amount', header: 'Amount', render: (r: any) => <span className="font-mono">${Number(r.amount).toFixed(2)}</span> },
    { key: 'total', header: 'Total', render: (r: any) => <span className="font-mono font-bold">${Number(r.total).toFixed(2)}</span> },
    { key: 'email_sent', header: 'Status', render: (r: any) => r.email_sent ? <Badge variant="green">Emailed</Badge> : <Badge variant="yellow">Pending</Badge> },
    { key: 'created_at', header: 'Date', render: (r: any) => <span className="text-dark-400 text-sm">{new Date(r.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">Invoices</h1>
        <p className="text-dark-400 mt-1">View and manage invoices</p>
      </motion.div>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={data || []} emptyTitle="No invoices" emptyDescription="Invoices will appear here after payments." />
      </div>
    </div>
  );
}
