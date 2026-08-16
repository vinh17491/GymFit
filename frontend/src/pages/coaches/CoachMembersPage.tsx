import { useEffect, useState } from 'react';
import { Search, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { listMembers } from '../../services/coachWorkspaceApi';
import type { CoachMember } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, inputClass, LoadingState } from './CoachCommon';

export default function CoachMembersPage() {
  const [items, setItems] = useState<CoachMember[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    listMembers({ q: q || undefined, page, limit: 20 }, { signal })
      .then(result => {
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => { if (!signal?.aborted) setError('Không thể tải Member trong scope.'); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [q, page]);

  return <CoachPage title="My Members" description="Chỉ Member active được phân công cho Coach hiện tại mới xuất hiện." actions={<Link className="secondary-button" to="/coach/assignments/new">Gán Program</Link>}>
    <div className="dashboard-panel mb-6"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className={`${inputClass} pl-10`} aria-label="Tìm Member" value={q} onChange={event => { setPage(1); setQ(event.target.value); }} placeholder="Tìm theo tên hoặc email" /></div></div>
    {error ? <ErrorState message={error} retry={() => void load()} /> : loading ? <LoadingState /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state">Chưa có Member active được phân công.</div></div> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(member => <Link key={member.id} to={`/coach/members/${member.id}`} className="dashboard-panel block hover:border-emerald-400/50"><div className="flex items-center gap-3"><span className="quick-icon"><UserCircle size={18} /></span><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-white">{member.name}</h2><p className="truncate text-sm text-slate-400">{member.email}</p></div></div><p className="mt-4 text-xs text-slate-500">Được phân công từ {String(member.assigned_at).slice(0, 10)}</p></Link>)}</div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
