import { useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { cancelSchedule, generateSchedules, getMember, listSchedules, reschedule } from '../../services/coachWorkspaceApi';
import type { CoachMemberDetail, CoachSchedule } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, inputClass, LoadingState } from './CoachCommon';

export default function CoachSchedulesPage() {
  const { memberId } = useParams();
  const [items, setItems] = useState<CoachSchedule[]>([]);
  const [member, setMember] = useState<CoachMemberDetail | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [horizon, setHorizon] = useState(30);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftDate, setDraftDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generationSummary, setGenerationSummary] = useState<{ inserted: number; skipped: number; fromDate: string; toDate: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    const schedules = listSchedules({ page, limit: 20, memberId: memberId || undefined });
    const done = memberId ? Promise.all([schedules, getMember(Number(memberId))]) : Promise.all([schedules, Promise.resolve(null)]);
    done.then(([s, m]) => {
      setItems(s.items);
      setTotal(s.total);
      setTotalPages(s.totalPages);
      setMember(m);
    }).catch(() => setError('Không thể tải schedule trong scope.')).finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [memberId]);
  useEffect(() => { load(); }, [memberId, page]);

  const generate = async () => {
    if (!member?.currentAssignment) return;
    try {
      const result = await generateSchedules(member.currentAssignment.id, { horizonDays: horizon });
      setGenerationSummary({ inserted: result.inserted, skipped: result.skipped, fromDate: result.fromDate, toDate: result.toDate });
      load();
    } catch {
      setError('Không thể generate schedule. Assignment phải ACTIVE và Program có Day.');
    }
  };

  const move = async (item: CoachSchedule) => {
    if (!draftDate) return;
    try {
      const next = await reschedule(item.id, draftDate);
      setItems(old => old.map(row => row.id === item.id ? { ...row, ...next } : row));
      setEditingId(null);
    } catch {
      setError('Chỉ schedule tương lai ở trạng thái SCHEDULED mới reschedule được.');
    }
  };

  const stop = async (item: CoachSchedule) => {
    try {
      const next = await cancelSchedule(item.id);
      setItems(old => old.map(row => row.id === item.id ? { ...row, ...next } : row));
    } catch {
      setError('Không thể cancel schedule đã bắt đầu hoặc đã hoàn tất.');
    }
  };

  return <CoachPage title={member ? `${member.name} · Schedule` : 'Schedules'} description="Schedule thuộc active Coach scope; generation idempotent và chỉ chỉnh lịch tương lai." actions={member?.currentAssignment ? <div className="flex items-center gap-2"><input aria-label="Số ngày generate" className={`${inputClass} w-24`} type="number" min={1} max={90} value={horizon} onChange={event => setHorizon(Number(event.target.value))} /><button className="primary-button inline-flex items-center gap-2" onClick={() => void generate()}><RefreshCw size={15} /> Generate</button></div> : undefined}>
    {error && <ErrorState message={error} retry={load} />}
    {generationSummary && <div className="mb-4 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">Đã xử lý {generationSummary.fromDate} → {generationSummary.toDate}: tạo {generationSummary.inserted}, bỏ qua {generationSummary.skipped}.</div>}
    {loading ? <LoadingState /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state"><Calendar size={20} /> Chưa có schedule. {member?.currentAssignment ? 'Generate horizon để tạo lịch.' : 'Member chưa có assignment active.'}</div></div> : <>
      <div className="dashboard-panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Ngày</th><th>Member</th><th>Program / Day</th><th>Status</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="py-4 text-white">{editingId === item.id ? <input type="date" aria-label="Ngày mới" className={`${inputClass} w-40`} value={draftDate} onChange={event => setDraftDate(event.target.value)} /> : String(item.scheduled_date).slice(0, 10)}</td><td className="text-slate-300">{item.member_name}</td><td className="text-slate-400">{item.program_name} · {item.day_title}</td><td><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{item.status}</span></td><td className="space-x-2">{item.status === 'SCHEDULED' && <>{editingId === item.id ? <><button className="text-xs text-emerald-400" onClick={() => void move(item)}>Lưu</button><button className="text-xs text-slate-400" onClick={() => setEditingId(null)}>Hủy</button></> : <><button className="text-xs text-emerald-400" onClick={() => { setEditingId(item.id); setDraftDate(String(item.scheduled_date).slice(0, 10)); }}>Reschedule</button><button className="text-xs text-red-300" onClick={() => void stop(item)}>Cancel</button></>}</>}</td></tr>)}</tbody></table></div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
