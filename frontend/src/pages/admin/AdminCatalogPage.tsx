import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { adminCatalogApi, type CatalogEntity } from '../../services/adminCatalogApi';
import type { Brand, BrandInput, CatalogActionResult, CatalogFormErrors, CatalogListFilters, CatalogSortField, CatalogSortOrder, Category, CategoryInput, Pagination } from '../../types/adminCatalog';

type CatalogRow = Category | Brand;
type CatalogForm = { name: string; slug: string; description: string; imageUrl: string; sortOrder: string; isActive: boolean };
const emptyForm: CatalogForm = { name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', isActive: true };
const message = (error: unknown) => error instanceof AxiosError && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Operation failed';
const isCategory = (entity: CatalogEntity): entity is 'categories' => entity === 'categories';

function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try { new URL(value); return true; } catch { return false; }
}

export default function AdminCatalogPage({ entity }: { entity: CatalogEntity }) {
  const category = isCategory(entity);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [filters, setFilters] = useState<CatalogListFilters>({ page: 1, limit: 20, search: '', status: '', sortBy: category ? 'sort_order' : 'name', sortOrder: 'asc' });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CatalogRow | null | undefined>(undefined);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<CatalogFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<CatalogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = category ? await adminCatalogApi.listCategories(filters) : await adminCatalogApi.listBrands(filters);
      setRows(response.data.data);
      setPagination(response.data.pagination ?? { page: filters.page, limit: filters.limit, total: response.data.data.length, pages: 1 });
    } catch (error) {
      toast.error(message(error));
    } finally {
      setLoading(false);
    }
  }, [category, filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setFilters(current => ({ ...current, page: 1, sortBy: category ? 'sort_order' : 'name' })); }, [category]);

  const updateFilters = <K extends keyof CatalogListFilters>(key: K, value: CatalogListFilters[K]) => setFilters(current => ({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 }));
  const openForm = (row?: CatalogRow) => {
    setEditing(row ?? null);
    setForm(row ? { name: row.name, slug: row.slug, description: row.description ?? '', imageUrl: category ? (row as Category).image_url ?? '' : (row as Brand).logo_url ?? '', sortOrder: category ? String((row as Category).sort_order) : '0', isActive: row.is_active } : emptyForm);
    setFormErrors({});
  };
  const closeForm = () => { if (!saving) { setEditing(undefined); setForm(emptyForm); setFormErrors({}); } };
  const validate = (): CatalogFormErrors => {
    const errors: CatalogFormErrors = {};
    if (!form.name.trim()) errors.name = 'Name is required'; else if (form.name.trim().length > 200) errors.name = 'Name must be 200 characters or fewer';
    if (form.slug.trim().length > 200) errors.slug = 'Slug must be 200 characters or fewer';
    if (form.description.length > 1000) errors.description = 'Description must be 1000 characters or fewer';
    if (!isValidUrl(form.imageUrl)) errors.imageUrl = `${category ? 'Image' : 'Logo'} URL must be valid or empty`;
    if (category) { const sortOrder = Number(form.sortOrder); if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) errors.sortOrder = 'Sort order must be a non-negative safe integer'; }
    return errors;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const errors = validate(); setFormErrors(errors);
    if (Object.keys(errors).length) return;
    const common = { name: form.name.trim(), slug: form.slug.trim() || undefined, description: form.description.trim() || null, is_active: form.isActive };
    setSaving(true);
    try {
      if (category) {
        const input: CategoryInput = { ...common, image_url: form.imageUrl.trim() || null, sort_order: Number(form.sortOrder) };
        if (editing) await adminCatalogApi.updateCategory(editing.id, input); else await adminCatalogApi.createCategory(input);
      } else {
        const input: BrandInput = { ...common, logo_url: form.imageUrl.trim() || null };
        if (editing) await adminCatalogApi.updateBrand(editing.id, input); else await adminCatalogApi.createBrand(input);
      }
      toast.success(editing ? `${category ? 'Category' : 'Brand'} updated.` : `${category ? 'Category' : 'Brand'} created.`);
      setEditing(undefined); setForm(emptyForm); await load();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!removing || deleting) return;
    setDeleting(true);
    try {
      const response = category ? await adminCatalogApi.deleteCategory(removing.id) : await adminCatalogApi.deleteBrand(removing.id);
      const result: CatalogActionResult = response.data.data;
      if (result.action === 'DELETED') toast.success(`${category ? 'Category' : 'Brand'} deleted.`);
      else toast.success(`${category ? 'Category' : 'Brand'} is referenced by Products and has been disabled.`);
      setRemoving(null); await load();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setDeleting(false);
    }
  };
  const sortFields: CatalogSortField[] = category ? ['name', 'created_at', 'product_count', 'sort_order'] : ['name', 'created_at', 'product_count'];
  const heading = category ? 'Categories' : 'Brands';

  return <div className="space-y-5 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{heading}</h1><p className="text-sm text-slate-400">{pagination.total} records</p></div><div className="flex gap-2"><button type="button" className="btn-secondary flex items-center gap-2" aria-label={`Refresh ${heading.toLowerCase()}`} title={`Refresh ${heading.toLowerCase()}`} disabled={loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh</button><button type="button" className="btn-primary flex items-center gap-2" onClick={() => openForm()}><Plus size={16} aria-hidden="true" />Create {category ? 'category' : 'brand'}</button></div></div>
    <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2 lg:grid-cols-5"><label>Search<input aria-label={`Search ${heading}`} className="input-field mt-1 w-full" value={filters.search ?? ''} placeholder="Search name or slug" onChange={event => updateFilters('search', event.target.value)} /></label><label>Status<select aria-label={`${heading} status`} className="input-field mt-1 w-full" value={filters.status ?? ''} onChange={event => updateFilters('status', event.target.value as CatalogListFilters['status'])}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label>Sort by<select aria-label={`${heading} sort field`} className="input-field mt-1 w-full" value={filters.sortBy} onChange={event => updateFilters('sortBy', event.target.value as CatalogSortField)}>{sortFields.map(field => <option key={field} value={field}>{field}</option>)}</select></label><label>Sort order<select aria-label={`${heading} sort order`} className="input-field mt-1 w-full" value={filters.sortOrder} onChange={event => updateFilters('sortOrder', event.target.value as CatalogSortOrder)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><button type="button" className="btn-secondary self-end" onClick={() => setFilters({ page: 1, limit: 20, search: '', status: '', sortBy: category ? 'sort_order' : 'name', sortOrder: 'asc' })}>Reset filters</button></div>
    {loading ? <div className="p-10 text-center text-slate-400">Loading {heading.toLowerCase()}…</div> : rows.length === 0 ? <div className="rounded-xl border border-slate-800 p-10 text-center text-slate-400">No {heading.toLowerCase()} match these filters.</div> : <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[900px] text-sm"><thead><tr><th>Name</th><th>Slug</th><th>Description</th><th>Product count</th>{category && <th>Sort order</th>}<th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-800"><td className="p-3 font-medium">{row.name}</td><td>{row.slug}</td><td className="max-w-xs truncate" title={row.description ?? ''}>{row.description ?? '—'}</td><td>{row.product_count}</td>{category && <td>{(row as Category).sort_order}</td>}<td><span className={row.is_active ? 'text-emerald-400' : 'text-slate-400'}>{row.is_active ? 'Active' : 'Inactive'}</span></td><td>{new Date(row.updated_at).toLocaleString()}</td><td><div className="flex gap-3"><button type="button" className="text-blue-400" aria-label={`Edit ${row.name}`} onClick={() => openForm(row)}>Edit</button><button type="button" className="text-red-400" aria-label={`Delete or disable ${row.name}`} onClick={() => setRemoving(row)}><Trash2 size={16} aria-hidden="true" /></button></div></td></tr>)}</tbody></table></div>}
    <div className="flex items-center justify-between"><span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={loading || filters.page <= 1} onClick={() => updateFilters('page', Math.max(1, filters.page - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={loading || filters.page >= Math.max(1, pagination.pages)} onClick={() => updateFilters('page', filters.page + 1)}>Next</button></div></div>
    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}><form aria-label={`${editing ? 'Edit' : 'Create'} ${category ? 'category' : 'brand'}`} className="w-full max-w-xl space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6" onSubmit={submit}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? 'Edit' : 'Create'} {category ? 'Category' : 'Brand'}</h2><button type="button" aria-label="Close catalog form" disabled={saving} onClick={closeForm}><X aria-hidden="true" /></button></div><div className="grid gap-3 sm:grid-cols-2"><label>Name<input aria-label="Name" required maxLength={200} className="input-field mt-1 w-full" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label>Slug<input aria-label="Slug" maxLength={200} className="input-field mt-1 w-full" value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} /></label><label className="sm:col-span-2">Description<textarea aria-label="Description" maxLength={1000} rows={3} className="input-field mt-1 w-full" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label className={category ? '' : 'sm:col-span-2'}>{category ? 'Image URL' : 'Logo URL'}<input aria-label={category ? 'Image URL' : 'Logo URL'} type="url" maxLength={1000} className="input-field mt-1 w-full" value={form.imageUrl} onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))} /></label>{category && <label>Sort order<input aria-label="Sort order" type="number" min="0" step="1" className="input-field mt-1 w-full" value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: event.target.value }))} /></label>}<label className="flex items-center gap-2"><input aria-label="Active" type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} />Active</label></div>{Object.values(formErrors).map(formError => <p key={formError} role="alert" className="text-sm text-red-400">{formError}</p>)}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={saving} onClick={closeForm}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div></form></div>}
    {removing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setRemoving(null); }}><section role="dialog" aria-modal="true" aria-labelledby="catalog-delete-title" className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6"><div className="flex items-center justify-between"><h2 id="catalog-delete-title" className="text-xl font-bold">Delete or disable {category ? 'category' : 'brand'}</h2><button type="button" aria-label="Close delete confirmation" disabled={deleting} onClick={() => setRemoving(null)}><X aria-hidden="true" /></button></div><p>Remove <strong>{removing.name}</strong>? If it is referenced by Products, it will be disabled instead.</p><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={deleting} onClick={() => setRemoving(null)}>Cancel</button><button type="button" className="btn-primary" disabled={deleting} onClick={() => void remove()}>{deleting ? 'Working…' : 'Confirm'}</button></div></section></div>}
  </div>;
}
