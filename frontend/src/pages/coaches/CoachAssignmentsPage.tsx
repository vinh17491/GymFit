import { useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { listAssignments } from '../../services/coachWorkspaceApi';
import type { CoachAssignment } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, LoadingState } from './CoachCommon';

export default function CoachAssignmentsPage() {
  const [params] = useSearchParams();
  const memberId = params.get('memberId');
  const [items, setItems] = useState<CoachAssignment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    listAssignments({ page, limit: 20, memberId: memberId || undefined })
      .then(result => {
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => setError('Không thể tải assignment trong scope.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [memberId]);
  useEffect(() => { load(); }, [memberId, page]);

  return <CoachPage title="Assignments" description="Gán Program active của Coach cho Member thuộc scope; state transition có kiểm soát." actions={<Link className="primary-button inline-flex items-center gap-2" to="/coach/assignments/new"><Plus size={17} /> Gán Program</Link>}>
    {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state"><ClipboardList size={20} /> Chưa có assignment.</div></div> : <>
      <div className="dashboard-panel overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Member</th><th>Program</th><th>Status</th><th>Start</th><th>Timezone</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="py-4 text-white">{item.member_name}</td><td className="text-slate-300">{item.program_name}</td><td><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{item.status}</span></td><td className="text-slate-400">{String(item.start_date).slice(0, 10)}</td><td className="text-slate-400">{item.schedule_timezone}</td><td><Link className="text-emerald-400 hover:text-emerald-300" to={`/coach/assignments/${item.id}`}>Chi tiết</Link></td></tr>)}</tbody></table></div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
