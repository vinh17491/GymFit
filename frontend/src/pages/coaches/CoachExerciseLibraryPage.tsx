import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { listCoachExercises } from '../../services/coachWorkspaceApi';
import type { CoachExercise } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, inputClass, LoadingState } from './CoachCommon';

export default function CoachExerciseLibraryPage() {
  const [items, setItems] = useState<CoachExercise[]>([]);
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    listCoachExercises({ q: q || undefined, difficulty: difficulty || undefined, page, limit: 12, sort: 'name_asc' })
      .then(result => {
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch(() => setError('Không thể tải Exercise active.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [q, difficulty, page]);

  return <CoachPage title="Exercise Library" description="Nguồn Exercise active, read-only, dùng để xây Program." actions={<span className="secondary-button inline-flex items-center gap-2"><SlidersHorizontal size={16} /> Read-only</span>}>
    <div className="dashboard-panel mb-6">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input aria-label="Tìm Exercise" className={`${inputClass} pl-10`} value={q} onChange={event => { setPage(1); setQ(event.target.value); }} placeholder="Tìm theo tên hoặc hướng dẫn" /></label>
        <select aria-label="Lọc difficulty" className={inputClass} value={difficulty} onChange={event => { setPage(1); setDifficulty(event.target.value); }}><option value="">Mọi difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
        <button className="secondary-button" onClick={load}>Làm mới</button>
      </div>
    </div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={load} /> : items.length === 0 ? <div className="dashboard-panel"><div className="panel-state">Không có Exercise phù hợp.</div></div> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(exercise => <Link key={exercise.id} to={`/coach/exercises/${exercise.id}`} className="dashboard-panel block hover:border-emerald-400/50">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-emerald-400">{exercise.muscle_group || 'Exercise'}</p><h2 className="mt-1 text-lg font-semibold text-white">{exercise.name}</h2></div><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{exercise.difficulty || '—'}</span></div>
          <p className="mt-3 line-clamp-3 text-sm text-slate-400">{exercise.description || 'Không có mô tả.'}</p>
          <p className="mt-4 text-xs text-slate-500">{exercise.equipment || 'Không yêu cầu dụng cụ'}</p>
        </Link>)}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    </>}
  </CoachPage>;
}
