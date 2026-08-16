import { useEffect, useState } from 'react';
import { Eye, Filter } from 'lucide-react';
import { Pagination } from '../../../components/shared/Pagination';
import { DashboardPageHeader, EmptyState, PanelError } from '../../../components/dashboard/DashboardPrimitives';
import { inputClass } from '../../../pages/coaches/CoachCommon';
import { listAdminAssignments, listAdminPrograms, listAdminProgress, listAdminSchedules, listAdminSessions } from '../../../services/adminWorkoutApi';
import type { AdminWorkoutRecord } from '../../../types/adminWorkout';

type Tab = 'programs' | 'assignments' | 'schedules' | 'sessions' | 'progress';
const errorMessage = (error: unknown) => { const value = error as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || 'Không thể tải Workout Governance.'; };
const text = (row: AdminWorkoutRecord, key: string) => String(row[key] ?? '—');
const columns: Record<Tab, Array<[string, string]>> = {
  programs: [['name', 'Program'], ['coach_name', 'Coach'], ['is_active', 'Status'], ['assignment_count', 'Assignments'], ['updated_at', 'Cập nhật']],
  assignments: [['member_name', 'Member'], ['coach_name', 'Coach'], ['program_name', 'Program'], ['start_date', 'Start'], ['end_date', 'End'], ['status', 'Status']],
  schedules: [['member_name', 'Member'], ['coach_name', 'Coach'], ['program_name', 'Program'], ['scheduled_date', 'Ngày tập'], ['status', 'Status']],
  sessions: [['member_name', 'Member'], ['coach_name', 'Coach'], ['program_name', 'Program'], ['status', 'Status'], ['duration_seconds', 'Duration'], ['set_count', 'Sets']],
  progress: [['member_name', 'Member'], ['coach_name', 'Coach'], ['completed_sessions', 'Completed'], ['total_duration', 'Duration'], ['training_volume', 'Volume'], ['completion_rate', 'Rate']],
};

export default function AdminWorkoutGovernancePage() {
  const [tab, setTab] = useState<Tab>('programs');
  const [rows, setRows] = useState<AdminWorkoutRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coachId, setCoachId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const params = { page, limit: 20, coachId: coachId ? Number(coachId) : undefined, memberId: memberId ? Number(memberId) : undefined, status: status || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined };
    try {
      const result = tab === 'programs' ? await listAdminPrograms(params) : tab === 'assignments' ? await listAdminAssignments(params) : tab === 'schedules' ? await listAdminSchedules(params) : tab === 'sessions' ? await listAdminSessions(params) : await listAdminProgress(params);
      setRows(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [tab, coachId, memberId, status, fromDate, toDate]);
  useEffect(() => { void load(); }, [tab, coachId, memberId, status, fromDate, toDate, page]);

  const statuses = tab === 'programs' ? ['ACTIVE', 'INACTIVE'] : tab === 'sessions' ? ['IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'CANCELLED'] : tab === 'assignments' ? ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] : tab === 'schedules' ? ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'] : ['COMPLETED', 'ABANDONED'];

  return <div className="dashboard-page">
    <DashboardPageHeader eyebrow="ADMIN WORKOUT GOVERNANCE" title="Workout Governance" description="Read-only visibility cho Programs, Assignments, Schedules, Sessions và Progress. Admin không sửa Session, Snapshot hoặc Set Log." action={<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-400"><Eye size={15} className="mr-2 inline text-emerald-300" />Read-only</div>} />
    <div className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">{(['programs', 'assignments', 'schedules', 'sessions', 'progress'] as Tab[]).map(key => <button key={key} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm capitalize ${tab === key ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-400 hover:text-white'}`} onClick={() => { setTab(key); setStatus(''); }}> {key} </button>)}</div>
    <div className="dashboard-panel mb-6"><div className="mb-3 flex items-center gap-2 text-sm text-slate-400"><Filter size={15} /> Bộ lọc governance</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><input className={inputClass} type="number" min="1" placeholder="Coach ID" value={coachId} onChange={event => setCoachId(event.target.value)} /><input className={inputClass} type="number" min="1" placeholder="Member ID" value={memberId} onChange={event => setMemberId(event.target.value)} /><select className={inputClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">Mọi trạng thái</option>{statuses.map(item => <option key={item} value={item}>{item}</option>)}</select><input className={inputClass} type="date" aria-label="Từ ngày" value={fromDate} onChange={event => setFromDate(event.target.value)} /><input className={inputClass} type="date" aria-label="Đến ngày" value={toDate} onChange={event => setToDate(event.target.value)} /></div></div>
    {error && <PanelError message={error} onRetry={() => void load()} />}
    {loading ? <div className="panel-state">Đang tải governance…</div> : !rows.length ? <div className="dashboard-panel"><EmptyState title="Không có dữ liệu" description="Không có bản ghi phù hợp với bộ lọc hiện tại." /></div> : <><div className="overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500"><tr>{columns[tab].map(([, label]) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${text(row, 'id')}-${index}`} className="border-b border-slate-900 last:border-0">{columns[tab].map(([key]) => <td key={key} className="px-4 py-3 text-slate-300">{key === 'is_active' ? (text(row, key) === 'true' || text(row, key) === '1' ? 'ACTIVE' : 'INACTIVE') : text(row, key).slice(0, 30)}</td>)}</tr>)}</tbody></table></div><Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} /></>}
  </div>;
}
