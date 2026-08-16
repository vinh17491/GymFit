import { Archive, Copy, Dumbbell, Plus, Search, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { archiveProgram, cloneProgramVersion, listPrograms, publishProgram } from '../../services/coachWorkspaceApi';
import type { CoachProgram, CoachProgramLifecycle } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, inputClass, LoadingState } from './CoachCommon';

const lifecycleOf = (item: CoachProgram): CoachProgramLifecycle => item.lifecycle_status ?? (item.is_active ? 'PUBLISHED' : 'ARCHIVED');
const lifecycleClass: Record<CoachProgramLifecycle, string> = {
  DRAFT: 'bg-amber-400/15 text-amber-200',
  PUBLISHED: 'bg-emerald-400/15 text-emerald-300',
  ARCHIVED: 'bg-slate-800 text-slate-400',
};

export default function CoachProgramsPage() {
  const navigate = useNavigate();
  const requestRef = useRef(0);
  const [items, setItems] = useState<CoachProgram[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionKey, setActionKey] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await listPrograms({ q: q || undefined, page, limit: 20 }, { signal });
      if (requestId !== requestRef.current) return;
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      if (signal?.aborted) return;
      if (requestId === requestRef.current) setError('Unable to load Coach Programs.');
    } finally {
      if (!signal?.aborted && requestId === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [q, page]);

  const runLifecycleAction = async (item: CoachProgram, action: 'publish' | 'clone' | 'archive') => {
    const lifecycle = lifecycleOf(item);
    if (action === 'publish' && lifecycle !== 'DRAFT') return;
    if (action === 'archive' && lifecycle === 'ARCHIVED') return;
    if (action === 'clone' && lifecycle === 'ARCHIVED') return;
    setActionKey(`${item.id}:${action}`);
    setError('');
    try {
      if (action === 'clone') {
        const cloned = await cloneProgramVersion(item.id);
        navigate(`/coach/workout-programs/${cloned.id}`);
        return;
      }
      const updated = action === 'publish' ? await publishProgram(item.id) : await archiveProgram(item.id);
      setItems(current => current.map(row => row.id === item.id ? { ...row, ...updated } : row));
    } catch {
      setError(`Unable to ${action} Program version. It may have changed in another tab.`);
    } finally {
      setActionKey(null);
    }
  };

  return <CoachPage
    title="My Workout Programs"
    description="Mỗi Program là một version độc lập; chỉ version Published/Active mới được assign."
    actions={<Link className="primary-button inline-flex items-center gap-2" to="/coach/workout-programs/new"><Plus size={17} /> Create Program</Link>}
  >
    <div className="dashboard-panel mb-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
        <input
          className={`${inputClass} pl-10`}
          value={q}
          onChange={event => { setPage(1); setQ(event.target.value); }}
          placeholder="Search Programs"
          aria-label="Search Programs"
        />
      </div>
    </div>
    {error && <ErrorState message={error} retry={() => void load()} />}
    {loading ? <LoadingState /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state"><Dumbbell size={20} /> No Programs yet. Create your first version.</div></div> : <>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map(item => {
          const lifecycle = lifecycleOf(item);
          const busy = actionKey !== null;
          return <article className="dashboard-panel" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-slate-500">
                  <span>{item.goal}</span><span>•</span><span>{item.difficulty}</span>
                  <Link className="text-emerald-400 hover:text-emerald-300" to={`/coach/workout-programs/${item.id}`}>Version v{item.version_number ?? 1}</Link>
                </div>
                <h2 className="mt-2 truncate text-xl font-semibold text-white">{item.name}</h2>
                <p className="mt-1 text-xs text-slate-500">Root version #{item.root_program_id ?? item.id}{item.cloned_from_program_id ? ` · cloned from #${item.cloned_from_program_id}` : ''}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${lifecycleClass[lifecycle]}`}>{lifecycle}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.description || 'No description.'}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500"><span>{item.duration_weeks} weeks</span><span>{item.days_per_week} days/week</span><span>{item.day_count ?? 0} days</span><span>{item.exercise_count ?? 0} exercises</span></div>
            {lifecycle === 'ARCHIVED' && <p className="mt-4 text-xs text-slate-500">Archived versions remain readable for historical Assignments.</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="primary-button" to={`/coach/workout-programs/${item.id}`}>{lifecycle === 'DRAFT' ? 'Open Editor' : 'View Version'}</Link>
              {lifecycle === 'DRAFT' && <Link className="secondary-button" to={`/coach/workout-programs/${item.id}/edit`}>Edit Draft</Link>}
              {lifecycle === 'DRAFT' && <button className="secondary-button inline-flex items-center gap-1" disabled={busy} onClick={() => void runLifecycleAction(item, 'publish')}><Send size={14} /> Publish</button>}
              {lifecycle !== 'ARCHIVED' && <button className="secondary-button inline-flex items-center gap-1" disabled={busy} onClick={() => void runLifecycleAction(item, 'clone')}><Copy size={14} /> Clone Version</button>}
              {lifecycle !== 'ARCHIVED' && <button className="secondary-button inline-flex items-center gap-1" disabled={busy} onClick={() => void runLifecycleAction(item, 'archive')}><Archive size={14} /> Archive</button>}
            </div>
          </article>;
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
