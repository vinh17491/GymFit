import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import { Search } from 'lucide-react';

export default function CRMPage() {
  const { data, loading, error, refetch } = useApi<{items:Array<Record<string,unknown>>}>('/crm');
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'tags', header: 'Tags', render: (r: any) => r.tags ? r.tags.split(',').map((t: string) => <Badge key={t} variant='blue' className='mr-1'>{t.trim()}</Badge>) : <span className='text-[#64748B]'>-</span> },
    { key: 'lifetime_value', header: 'LTV', render: (r: any) => <span className='font-mono'></span> },
    { key: 'risk_score', header: 'Risk', render: (r: any) => <Badge variant={(r.risk_score || 0) > 70 ? 'red' : (r.risk_score || 0) > 30 ? 'yellow' : 'green'}>{r.risk_score || 0}</Badge> },
  ];
  return (
    <div className='animate-fade-in space-y-6'>
      <PageHeader title='CRM' subtitle='Customer relationship management' />
      <div className='card p-0'><DataTable columns={columns} data={data?.items || []} emptyTitle='No customers found' /></div>
    </div>
  );
}
