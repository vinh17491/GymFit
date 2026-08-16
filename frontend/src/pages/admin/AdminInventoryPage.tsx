import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';
import { adminCatalogApi } from '../../services/adminCatalogApi';
import type {
  AdjustmentHistoryFilters,
  AdminProductOption,
  Brand,
  Category,
  InventoryAdjustment,
  InventoryAdjustmentInput,
  InventoryFilters,
  InventoryItem,
  Pagination,
} from '../../types/adminCatalog';

const defaults: InventoryFilters = { search: '', categoryId: '', brandId: '', productId: '', status: '', lowStock: false, sortBy: 'updated_at', sortOrder: 'desc', page: 1, limit: 20 };
const historyDefaults: AdjustmentHistoryFilters = { type: '', dateFrom: '', dateTo: '', page: 1, limit: 20 };
type AdjustmentForm = { type: 'RESTOCK' | 'MANUAL_CORRECTION'; mode: 'DELTA' | 'ABSOLUTE'; quantityDelta: string; targetOnHand: string; reason: string; referenceType: string; referenceId: string };
const emptyAdjustment: AdjustmentForm = { type: 'RESTOCK', mode: 'DELTA', quantityDelta: '', targetOnHand: '', reason: '', referenceType: '', referenceId: '' };
const errorMessage = (error: unknown) => error instanceof AxiosError && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'Operation failed';

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>(defaults);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<AdminProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<AdjustmentForm>(emptyAdjustment);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [thresholdItem, setThresholdItem] = useState<InventoryItem | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [thresholdError, setThresholdError] = useState('');
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [historyFilters, setHistoryFilters] = useState<AdjustmentHistoryFilters>(historyDefaults);
  const [historyRows, setHistoryRows] = useState<InventoryAdjustment[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminCatalogApi.inventory(filters);
      setRows(response.data.data);
      setPagination(response.data.pagination ?? { page: filters.page, limit: filters.limit, total: response.data.data.length, pages: 1 });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void (async () => {
      try {
        const [categoryResponse, brandResponse, firstProducts] = await Promise.all([
          adminCatalogApi.listCatalog<Category>('categories', { page: 1, limit: 100, is_active: true }),
          adminCatalogApi.listCatalog<Brand>('brands', { page: 1, limit: 100, is_active: true }),
          adminCatalogApi.listAdminProducts({ page: 1, limit: 100 }),
        ]);
        const productPages = firstProducts.data.pagination?.pages ?? 1;
        const remaining = productPages > 1 ? await Promise.all(Array.from({ length: productPages - 1 }, (_, index) => adminCatalogApi.listAdminProducts({ page: index + 2, limit: 100 }))) : [];
        setCategories(categoryResponse.data.data.filter(item => item.is_active));
        setBrands(brandResponse.data.data.filter(item => item.is_active));
        setProducts([firstProducts, ...remaining].flatMap(response => response.data.data).filter(item => item.is_active));
      } catch {
        toast.error('Unable to load filter options');
      }
    })();
  }, []);

  const loadHistory = useCallback(async () => {
    if (!historyItem) return;
    if (historyFilters.dateFrom && historyFilters.dateTo && historyFilters.dateFrom > historyFilters.dateTo) {
      setHistoryError('Date From must be on or before Date To');
      return;
    }
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await adminCatalogApi.getInventoryAdjustments(historyItem.variant_id, historyFilters);
      setHistoryRows(response.data.data);
      setHistoryPagination(response.data.pagination);
    } catch (loadError) {
      setHistoryError(errorMessage(loadError));
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters, historyItem]);

  useEffect(() => { if (historyItem) void loadHistory(); }, [historyItem, loadHistory]);

  const update = <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => setFilters(current => ({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 }));
  const updateHistory = <K extends keyof AdjustmentHistoryFilters>(key: K, value: AdjustmentHistoryFilters[K]) => setHistoryFilters(current => ({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 }));
  const openAdjustment = (item: InventoryItem) => { setAdjusting(item); setForm(emptyAdjustment); setFormError(''); };
  const closeAdjustment = () => { if (!saving) { setAdjusting(null); setForm(emptyAdjustment); setFormError(''); } };
  const openThreshold = (item: InventoryItem) => { setThresholdItem(item); setThresholdValue(String(item.low_stock_threshold)); setThresholdError(''); };
  const closeThreshold = () => { if (!thresholdSaving) { setThresholdItem(null); setThresholdValue(''); setThresholdError(''); } };
  const openHistory = (item: InventoryItem) => { setHistoryRows([]); setHistoryError(''); setHistoryFilters(historyDefaults); setHistoryItem(item); };
  const closeHistory = () => { if (!historyLoading) { setHistoryItem(null); setHistoryRows([]); setHistoryFilters(historyDefaults); setHistoryError(''); } };

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!adjusting || saving) return;
    const reason = form.reason.trim();
    let payload: InventoryAdjustmentInput;
    setFormError('');
    if (!reason) { setFormError('Reason is required'); return; }
    if (reason.length > 500) { setFormError('Reason must be 500 characters or fewer'); return; }
    if (form.referenceType.trim().length > 100 || form.referenceId.trim().length > 100) { setFormError('Reference fields must be 100 characters or fewer'); return; }
    const referenceType = form.referenceType.trim() || null;
    const referenceId = form.referenceId.trim() || null;
    if (form.mode === 'ABSOLUTE') {
      const target = Number(form.targetOnHand);
      if (form.type !== 'MANUAL_CORRECTION') { setFormError('RESTOCK only supports DELTA mode'); return; }
      if (!Number.isSafeInteger(target) || target < 0) { setFormError('Target on hand must be a non-negative safe integer'); return; }
      payload = { type: 'MANUAL_CORRECTION', targetOnHand: target, reason, referenceType, referenceId };
    } else {
      const delta = Number(form.quantityDelta);
      if (!Number.isSafeInteger(delta) || delta === 0) { setFormError('Quantity delta must be a non-zero safe integer'); return; }
      if (form.type === 'RESTOCK' && delta <= 0) { setFormError('RESTOCK requires a positive delta'); return; }
      payload = { type: form.type, quantityDelta: delta, reason, referenceType, referenceId };
    }
    setSaving(true);
    try {
      const result = (await adminCatalogApi.adjustInventory(adjusting.variant_id, payload)).data.data;
      toast.success(`Stock updated: ${result.previousOnHand} → ${result.newOnHand}`);
      setAdjusting(null);
      setForm(emptyAdjustment);
      await load();
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const submitThreshold = async (event: FormEvent) => {
    event.preventDefault();
    if (!thresholdItem || thresholdSaving) return;
    setThresholdError('');
    if (!thresholdValue.trim()) { setThresholdError('Low-stock threshold is required'); return; }
    const value = Number(thresholdValue);
    if (!Number.isSafeInteger(value) || value < 0) { setThresholdError('Low-stock threshold must be a non-negative safe integer'); return; }
    setThresholdSaving(true);
    try {
      await adminCatalogApi.updateInventoryThreshold(thresholdItem.variant_id, value);
      setThresholdItem(null);
      setThresholdValue('');
      toast.success('Low-stock threshold updated');
      await load();
    } catch (submitError) {
      setThresholdError(errorMessage(submitError));
    } finally {
      setThresholdSaving(false);
    }
  };

  return <div className="space-y-5 p-4 md:p-8">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Inventory</h1><p className="text-sm text-slate-400">{pagination.total} records</p></div><button type="button" aria-label="Refresh inventory" title="Refresh inventory" disabled={loading} className="btn-secondary flex items-center gap-2" onClick={() => void load()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh</button></div>
    <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2 xl:grid-cols-5">
      <label>Search Product/SKU<input aria-label="Search Product/SKU" className="input-field mt-1 w-full" value={filters.search} onChange={event => update('search', event.target.value)} /></label>
      <label>Category<select aria-label="Category" className="input-field mt-1 w-full" value={filters.categoryId} onChange={event => update('categoryId', event.target.value)}><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Brand<select aria-label="Brand" className="input-field mt-1 w-full" value={filters.brandId} onChange={event => update('brandId', event.target.value)}><option value="">All brands</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Product<select aria-label="Product" className="input-field mt-1 w-full" value={filters.productId} onChange={event => update('productId', event.target.value)}><option value="">All products</option>{products.map(item => <option key={item.id} value={item.id}>{item.product_name} (#{item.id})</option>)}</select></label>
      <label>Status<select aria-label="Status" className="input-field mt-1 w-full" value={filters.status} onChange={event => update('status', event.target.value as InventoryFilters['status'])}><option value="">All statuses</option><option value="IN_STOCK">IN_STOCK</option><option value="LOW_STOCK">LOW_STOCK</option><option value="OUT_OF_STOCK">OUT_OF_STOCK</option></select></label>
      <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={filters.lowStock} onChange={event => update('lowStock', event.target.checked)} />Low stock only</label>
      <label>Sort by<select aria-label="Sort by" className="input-field mt-1 w-full" value={filters.sortBy} onChange={event => update('sortBy', event.target.value as InventoryFilters['sortBy'])}>{['product_name', 'sku', 'on_hand', 'reserved', 'available', 'low_stock_threshold', 'updated_at'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Sort order<select aria-label="Sort order" className="input-field mt-1 w-full" value={filters.sortOrder} onChange={event => update('sortOrder', event.target.value as 'asc' | 'desc')}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      <label>Page size<select aria-label="Page size" className="input-field mt-1 w-full" value={filters.limit} onChange={event => update('limit', Number(event.target.value))}>{[10, 20, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label>
      <button type="button" className="btn-secondary self-end" onClick={() => setFilters(defaults)}>Reset filters</button>
    </div>
    {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">{error}<button type="button" className="ml-3 underline" onClick={() => void load()}>Retry</button></div> : loading ? <div className="p-10 text-center text-slate-400">Loading inventory…</div> : rows.length === 0 ? <div className="rounded-xl border border-slate-800 p-10 text-center text-slate-400">No inventory records match these filters.</div> : <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[1500px] text-sm"><thead><tr><th>Product</th><th>Category</th><th>Brand</th><th>Variant</th><th>SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Threshold</th><th>Status</th><th>Last restocked</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{rows.map(item => <tr key={item.inventory_id} className="border-t border-slate-800"><td>{item.product_name}</td><td>{item.category ?? '—'}</td><td>{item.brand ?? '—'}</td><td>{item.variant_name}</td><td>{item.sku}</td><td>{item.on_hand}</td><td>{item.reserved}</td><td>{item.available}</td><td>{item.low_stock_threshold}</td><td>{item.stock_status}</td><td>{item.last_restocked ? new Date(item.last_restocked).toLocaleString() : '—'}</td><td>{new Date(item.updated_at).toLocaleString()}</td><td><div className="flex gap-3 whitespace-nowrap"><button type="button" className="text-blue-400" onClick={() => openAdjustment(item)}>Adjust stock</button><button type="button" className="text-blue-400" onClick={() => openThreshold(item)}>Update threshold</button><button type="button" className="text-blue-400" onClick={() => openHistory(item)}>View history</button><Link className="text-blue-400" to={`/admin/products?search=${encodeURIComponent(item.product_name)}`}>Open Product</Link><Link className="text-blue-400" to={`/admin/products/${item.product_id}/variants`}>Open Variant</Link></div></td></tr>)}</tbody></table></div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><span>Page {pagination.page} of {Math.max(1, pagination.pages)} · {pagination.total} records</span><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={filters.page <= 1 || loading} onClick={() => update('page', Math.max(1, filters.page - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={filters.page >= Math.max(1, pagination.pages) || loading} onClick={() => update('page', filters.page + 1)}>Next</button></div></div>

    {adjusting && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeAdjustment(); }}><form aria-label="Stock adjustment" className="w-full max-w-xl space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6" onSubmit={submitAdjustment}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Adjust stock</h2><button type="button" aria-label="Close adjustment" onClick={closeAdjustment}><X aria-hidden="true" /></button></div><div className="rounded-lg bg-slate-900 p-3 text-sm"><p><strong>Product:</strong> {adjusting.product_name}</p><p><strong>Variant:</strong> {adjusting.variant_name}</p><p><strong>SKU:</strong> {adjusting.sku}</p><p>On hand {adjusting.on_hand} · Reserved {adjusting.reserved} · Available {adjusting.available}</p></div><div className="grid gap-3 sm:grid-cols-2"><label>Type<select aria-label="Adjustment type" className="input-field mt-1 w-full" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as AdjustmentForm['type'], mode: event.target.value === 'RESTOCK' ? 'DELTA' : current.mode }))}><option value="RESTOCK">RESTOCK</option><option value="MANUAL_CORRECTION">MANUAL_CORRECTION</option></select></label><label>Mode<select aria-label="Adjustment mode" className="input-field mt-1 w-full" value={form.mode} disabled={form.type === 'RESTOCK'} onChange={event => setForm(current => ({ ...current, mode: event.target.value as AdjustmentForm['mode'] }))}><option value="DELTA">DELTA</option><option value="ABSOLUTE">ABSOLUTE</option></select></label>{form.mode === 'DELTA' ? <label>Quantity delta<input aria-label="Quantity delta" type="number" step="1" className="input-field mt-1 w-full" value={form.quantityDelta} onChange={event => setForm(current => ({ ...current, quantityDelta: event.target.value }))} /></label> : <label>Target on hand<input aria-label="Target on hand" type="number" min="0" step="1" className="input-field mt-1 w-full" value={form.targetOnHand} onChange={event => setForm(current => ({ ...current, targetOnHand: event.target.value }))} /></label>}<label className="sm:col-span-2">Reason<textarea aria-label="Reason" required maxLength={500} rows={3} className="input-field mt-1 w-full" value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} /></label><label>Reference type<input aria-label="Reference type" maxLength={100} className="input-field mt-1 w-full" value={form.referenceType} onChange={event => setForm(current => ({ ...current, referenceType: event.target.value }))} /></label><label>Reference ID<input aria-label="Reference ID" maxLength={100} className="input-field mt-1 w-full" value={form.referenceId} onChange={event => setForm(current => ({ ...current, referenceId: event.target.value }))} /></label></div>{formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={saving} onClick={closeAdjustment}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Submit adjustment'}</button></div></form></div>}

    {thresholdItem && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeThreshold(); }}><form aria-label="Update low-stock threshold" className="w-full max-w-lg space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6" onSubmit={submitThreshold}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Update threshold</h2><button type="button" aria-label="Close threshold modal" disabled={thresholdSaving} onClick={closeThreshold}><X aria-hidden="true" /></button></div><div className="rounded-lg bg-slate-900 p-3 text-sm"><p><strong>Product:</strong> {thresholdItem.product_name}</p><p><strong>Variant:</strong> {thresholdItem.variant_name}</p><p><strong>SKU:</strong> {thresholdItem.sku}</p><p><strong>Current threshold:</strong> {thresholdItem.low_stock_threshold}</p><p>On hand {thresholdItem.on_hand} · Reserved {thresholdItem.reserved} · Available {thresholdItem.available}</p></div><label>Low-stock threshold<input name="lowStockThreshold" aria-label="Low-stock threshold" required type="number" min="0" step="1" className="input-field mt-1 w-full" value={thresholdValue} onChange={event => setThresholdValue(event.target.value)} /></label>{thresholdError && <p role="alert" className="text-sm text-red-400">{thresholdError}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={thresholdSaving} onClick={closeThreshold}>Cancel</button><button type="submit" className="btn-primary" disabled={thresholdSaving}>{thresholdSaving ? 'Updating…' : 'Update threshold'}</button></div></form></div>}

    {historyItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeHistory(); }}><section role="dialog" aria-modal="true" aria-labelledby="history-title" className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="history-title" className="text-xl font-bold">Inventory adjustment history</h2><p className="text-sm text-slate-400">{historyItem.product_name} · {historyItem.variant_name} · {historyItem.sku}</p></div><button type="button" aria-label="Close inventory history" disabled={historyLoading} onClick={closeHistory}><X aria-hidden="true" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label>Type<select aria-label="History adjustment type" className="input-field mt-1 w-full" value={historyFilters.type} onChange={event => updateHistory('type', event.target.value as AdjustmentHistoryFilters['type'])}><option value="">ALL</option><option value="RESTOCK">RESTOCK</option><option value="MANUAL_CORRECTION">MANUAL_CORRECTION</option></select></label><label>Date From<input aria-label="History date from" type="date" className="input-field mt-1 w-full" value={historyFilters.dateFrom} max={historyFilters.dateTo || undefined} onChange={event => updateHistory('dateFrom', event.target.value)} /></label><label>Date To<input aria-label="History date to" type="date" className="input-field mt-1 w-full" value={historyFilters.dateTo} min={historyFilters.dateFrom || undefined} onChange={event => updateHistory('dateTo', event.target.value)} /></label><label>Page size<select aria-label="History page size" className="input-field mt-1 w-full" value={historyFilters.limit} onChange={event => updateHistory('limit', Number(event.target.value) as AdjustmentHistoryFilters['limit'])}>{[10, 20, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label><button type="button" className="btn-secondary self-end" disabled={historyLoading} onClick={() => setHistoryFilters(historyDefaults)}>Reset filters</button></div>{historyError ? <div role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{historyError}<button type="button" className="ml-3 underline" disabled={historyLoading} onClick={() => void loadHistory()}>Retry</button></div> : historyLoading ? <div className="p-10 text-center text-slate-400">Loading history…</div> : historyRows.length === 0 ? <div className="mt-5 rounded-lg border border-slate-800 p-10 text-center text-slate-400">No inventory adjustments match these filters.</div> : <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800"><table className="w-full min-w-[1300px] text-sm"><thead><tr><th>Created time</th><th>Type</th><th>Previous on hand</th><th>Quantity delta</th><th>New on hand</th><th>Reason</th><th>Reference type</th><th>Reference ID</th><th>Admin name</th><th>Admin email</th></tr></thead><tbody>{historyRows.map(item => <tr key={item.id} className="border-t border-slate-800"><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.adjustment_type}</td><td>{item.previous_on_hand}</td><td className={item.quantity_delta > 0 ? 'text-emerald-400' : 'text-amber-400'}>{item.quantity_delta > 0 ? '+' : ''}{item.quantity_delta}</td><td>{item.new_on_hand}</td><td className="max-w-xs whitespace-normal">{item.reason}</td><td>{item.reference_type ?? '—'}</td><td>{item.reference_id ?? '—'}</td><td>{item.admin_name}</td><td>{item.admin_email}</td></tr>)}</tbody></table></div>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span>Page {historyPagination.page} of {Math.max(1, historyPagination.pages)} · {historyPagination.total} records</span><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={historyLoading || historyFilters.page <= 1} onClick={() => updateHistory('page', Math.max(1, historyFilters.page - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={historyLoading || historyFilters.page >= Math.max(1, historyPagination.pages)} onClick={() => updateHistory('page', historyFilters.page + 1)}>Next</button></div></div></section></div>}
  </div>;
}
