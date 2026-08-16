import { useApi } from '../../hooks/useApi';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/page-header';
import LoadingSpinner from '../../components/ui/loading-spinner';
import ErrorState from '../../components/ui/error-state';
import { Users, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const { data: dashboard, loading: l1, error: e1 } = useApi<any>('/analytics/dashboard');
  const { data: revenue } = useApi<any[]>('/analytics/revenue');
  const { data: growth } = useApi<any[]>('/analytics/user-growth');

  if (e1) return <ErrorState message='Failed to load analytics' />;

  return (
    <div className='animate-fade-in space-y-6'>
      <PageHeader title='Analytics' subtitle='Business performance metrics' />
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <StatCard title='Daily Active Users' value={dashboard?.dau || 0} icon={<Users size={20} />} />
        <StatCard title='Monthly Active Users' value={dashboard?.mau || 0} icon={<TrendingUp size={20} />} />
        <StatCard title='Daily Revenue' value={'$' + (dashboard?.dailyRevenue || 0)} icon={<DollarSign size={20} />} />
        <StatCard title='Churn Rate' value={(dashboard?.churnRate?.toFixed(1) || 0) + '%'} icon={<Percent size={20} />} trend={{ value: 2, positive: false }} />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='card'><h3 className='text-lg font-semibold mb-4'>Revenue Over Time</h3><div className='h-72'><ResponsiveContainer width='100%' height='100%'><LineChart data={revenue || []}><CartesianGrid strokeDasharray='3 3' stroke='#1e293b' /><XAxis dataKey='date' stroke='#64748B' fontSize={12} /><YAxis stroke='#64748B' fontSize={12} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} /><Line type='monotone' dataKey='revenue' stroke='#22C55E' strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
        <div className='card'><h3 className='text-lg font-semibold mb-4'>User Growth</h3><div className='h-72'><ResponsiveContainer width='100%' height='100%'><LineChart data={growth || []}><CartesianGrid strokeDasharray='3 3' stroke='#1e293b' /><XAxis dataKey='date' stroke='#64748B' fontSize={12} /><YAxis stroke='#64748B' fontSize={12} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} /><Line type='monotone' dataKey='new_users' stroke='#22C55E' strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}
