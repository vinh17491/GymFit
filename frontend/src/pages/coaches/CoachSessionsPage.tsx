import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { getMember, listSessions } from '../../services/coachWorkspaceApi';
import type { CoachMemberDetail, CoachSessionHistoryItem } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, LoadingState } from './CoachCommon';

export default function CoachSessionsPage() {
  const { memberId } = useParams();
  const [member, setMember] = useState<CoachMemberDetail | null>(null);
  const [items, setItems] = useState<CoachSessionHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError('');
    Promise.all([getMember(Number(memberId)), listSessions(Number(memberId), { page, limit: 20 })])
      .then(([m, s]) => {
        setMember(m);
        setItems(s.items);
        setTotal(s.total);
        setTotalPages(s.totalPages);
      })
      .catch(() => setError('Không thể tải session history trong scope.'))
      .finally(() => setLoading(false));
  }, [memberId, page]);

  return <CoachPage title={member ? `${member.name} · Session History` : 'Session History'} description="Read-only. Coach không start, log set, complete hoặc sửa terminal session." backTo={memberId ? `/coach/members/${memberId}` : '/coach/members'}>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state"><History size={20} /><span>Chưa có session history trong active Coach scope.</span></div></div> : <>
      <div className="dashboard-panel overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Workout</th><th>Source</th><th>Status</th><th>Sets</th><th>Started</th><th>Completed</th><th /></tr></thead><tbody>{items.map(item => <tr key={`${item.source}-${item.id}`} className="border-t border-slate-800"><td className="py-4 text-white">{item.workout_name}</td><td className="text-slate-400">{item.source}</td><td className="text-slate-300">{item.status}</td><td className="text-slate-400">{item.setSummary ? `${item.setSummary.completed}/${item.setSummary.total}` : 'Legacy'}</td><td className="text-slate-400">{new Date(item.started_at).toLocaleString('vi-VN')}</td><td className="text-slate-400">{item.completed_at ? new Date(item.completed_at).toLocaleString('vi-VN') : '—'}</td><td><Link className="text-emerald-400" to={`/coach/members/${memberId}/sessions/${item.source}/${item.id}`}>Chi tiết</Link></td></tr>)}</tbody></table></div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
