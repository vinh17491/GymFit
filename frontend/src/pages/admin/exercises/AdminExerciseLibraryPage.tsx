import { FormEvent, useEffect, useState } from 'react';
import { Edit3, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { DashboardPageHeader, EmptyState, PanelError } from '../../../components/dashboard/DashboardPrimitives';
import { inputClass } from '../../../pages/coaches/CoachCommon';
import { activateAdminExercise, createAdminExercise, deactivateAdminExercise, listAdminExercises, updateAdminExercise } from '../../../services/adminExerciseApi';
import type { AdminExercise, AdminExerciseInput } from '../../../types/adminExercise';

const blank: AdminExerciseInput = { name: '', description: '', instructions: '', muscle_group: '', equipment: '', difficulty: '', video_url: '', thumbnail_url: '' };
const errorMessage = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string };
  return value.response?.data?.message || value.message || 'Unable to load the Admin Exercise Library.';
};

export default function AdminExerciseLibraryPage() {
  const [items, setItems] = useState<AdminExercise[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<AdminExerciseInput>({ ...blank });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminExercises({ search: search || undefined, status: status || undefined, page, limit: 20 });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages || 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [search, status, page]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await updateAdminExercise(editing, form);
      else await createAdminExercise(form);
      setNotice(editing ? 'Exercise updated.' : 'Exercise created.');
      setEditing(null);
      setForm({ ...blank });
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: AdminExercise) => {
    if (!window.confirm(`${item.is_active ? 'Deactivate' : 'Activate'} this Exercise?`)) return;
    try {
      if (item.is_active) await deactivateAdminExercise(item.id);
      else await activateAdminExercise(item.id);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const edit = (item: AdminExercise) => {
    setEditing(item.id);
    setForm({ name: item.name, slug: item.slug, description: item.description, instructions: item.instructions, muscle_group: item.muscle_group, equipment: item.equipment, difficulty: item.difficulty, video_url: item.video_url, thumbnail_url: item.thumbnail_url });
    setNotice('');
  };

  const resetForm = () => { setEditing(null); setForm({ ...blank }); };

  return <div className="dashboard-page">
    <DashboardPageHeader eyebrow="ADMIN EXERCISE LIBRARY" title="Exercise Library" description="Create, edit, search and activate/deactivate the shared Coach Exercise library." action={<button className="primary-button" onClick={() => { setEditing(0); setForm({ ...blank }); }}><Plus size={16}/> Create Exercise</button>} />
    {notice && <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
    {error && <PanelError message={error} onRetry={() => void load()} />}
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="min-w-0">
        <div className="dashboard-panel mb-5"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17}/><input className={`${inputClass} pl-10`} value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} placeholder="Search name, description or instructions" aria-label="Search exercises" /></div><select className={inputClass} value={status} onChange={event => { setPage(1); setStatus(event.target.value); }} aria-label="Filter exercise status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div></div>
        {loading ? <div className="panel-state">Loading exercises...</div> : !items.length ? <div className="dashboard-panel"><EmptyState title="No exercises found" description="Create the first shared Exercise or change the current filters." /></div> : <div className="space-y-3">{items.map(item => <article key={item.id} className="dashboard-panel"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate font-semibold text-white">{item.name}</h2><span className={`text-xs ${item.is_active ? 'text-emerald-300' : 'text-slate-500'}`}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</span></div><p className="mt-1 text-sm text-slate-400">{item.muscle_group || '—'} · {item.equipment || '—'} · {item.difficulty || '—'}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description || 'No description.'}</p></div><div className="flex shrink-0 gap-2"><button type="button" className="secondary-button" onClick={() => edit(item)}><Edit3 size={15}/> Edit</button><button type="button" className="secondary-button" onClick={() => void toggle(item)}>{item.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>} {item.is_active ? 'Deactivate' : 'Activate'}</button></div></div></article>)}</div>}
        {!loading && items.length > 0 && <div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span>{total} exercises</span><div className="flex items-center gap-2"><button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page}/{totalPages}</span><button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
      </section>
      <section className="dashboard-panel h-fit"><h2 className="text-lg font-semibold text-white">{editing ? (editing === 0 ? 'Create Exercise' : 'Edit Exercise') : 'Select an action'}</h2>{editing !== null && <form className="mt-5 space-y-3" onSubmit={submit}><label className="block text-sm text-slate-400">Name<input required className={`${inputClass} mt-1`} value={form.name || ''} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label className="block text-sm text-slate-400">Slug (optional; generated if empty)<input className={`${inputClass} mt-1`} value={form.slug || ''} onChange={event => setForm({ ...form, slug: event.target.value || undefined })}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-400">Muscle group<input className={`${inputClass} mt-1`} value={form.muscle_group || ''} onChange={event => setForm({ ...form, muscle_group: event.target.value })}/></label><label className="text-sm text-slate-400">Equipment<input className={`${inputClass} mt-1`} value={form.equipment || ''} onChange={event => setForm({ ...form, equipment: event.target.value })}/></label><label className="text-sm text-slate-400">Difficulty<input className={`${inputClass} mt-1`} value={form.difficulty || ''} onChange={event => setForm({ ...form, difficulty: event.target.value })}/></label></div><label className="block text-sm text-slate-400">Description<textarea className={`${inputClass} mt-1 min-h-20`} value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })}/></label><label className="block text-sm text-slate-400">Instructions<textarea className={`${inputClass} mt-1 min-h-28`} value={form.instructions || ''} onChange={event => setForm({ ...form, instructions: event.target.value })}/></label><label className="block text-sm text-slate-400">Video URL<input className={`${inputClass} mt-1`} type="url" value={form.video_url || ''} onChange={event => setForm({ ...form, video_url: event.target.value || null })}/></label><label className="block text-sm text-slate-400">Thumbnail URL<input className={`${inputClass} mt-1`} type="url" value={form.thumbnail_url || ''} onChange={event => setForm({ ...form, thumbnail_url: event.target.value || null })}/></label><div className="flex gap-2"><button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button type="button" className="secondary-button" onClick={resetForm}>Cancel</button></div></form>}</section>
    </div>
  </div>;
}
