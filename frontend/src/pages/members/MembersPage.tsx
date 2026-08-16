import { useApi } from '../../hooks/useApi';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import Badge from '../../components/ui/badge';
import { motion } from 'framer-motion';
import { Search, UserPlus } from 'lucide-react';
import Input from '../../components/ui/input';
import { useState } from 'react';

export default function MembersPage() {
  const { data, loading, error, refetch } = useApi<{items:Array<{id:number;name:string;email:string;phone?:string;role:string;is_active:boolean}>}>('/users?limit=100');
  const [search, setSearch] = useState('');

  if (loading) return <LoadingSpinner text="Loading members..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data?.items || []).filter((r) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'name', header: 'Name', render: (r: {name:string}) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-medium text-primary-400">{r.name?.[0]}</div>
        <span className="font-medium">{r.name}</span>
      </div>
    )},
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (r: {role:string}) => <Badge variant="blue">{r.role}</Badge> },
    { key: 'is_active', header: 'Status', render: (r: {is_active:boolean}) => r.is_active?'Active':'Inactive' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="text-dark-400 mt-1">Manage gym members</p>
        </div>
        <button className="btn-primary"><UserPlus size={16} /> Add Member</button>
      </motion.div>
      <div className="flex gap-3 max-w-sm">
        <Input label="Search members" placeholder="Name or email" icon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-hidden">
        <DataTable columns={columns} data={filtered} emptyTitle="No members found" emptyDescription="Members will appear here once they register." />
      </div>
    </div>
  );
}
