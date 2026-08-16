import axios from 'axios';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrandRequest, brandRequestsApi } from '../../services/brandRequestsApi';

const apiMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

export default function SellerBrandRequestsPage() {
  const [items, setItems] = useState<BrandRequest[]>([]);
  const [form, setForm] = useState({ requestedName: '', websiteUrl: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);
  const listControllerRef = useRef<AbortController | null>(null);

  const loadRequests = useCallback(async () => {
    listControllerRef.current?.abort();
    const controller = new AbortController();
    listControllerRef.current = controller;
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await brandRequestsApi.sellerList({}, controller.signal);
      if (mountedRef.current && !controller.signal.aborted) setItems(response.data.data);
    } catch (loadError) {
      if (mountedRef.current && !controller.signal.aborted) {
        setError(apiMessage(loadError, 'Không thể tải yêu cầu Brand.'));
      }
    } finally {
      if (mountedRef.current && listControllerRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadRequests();
    return () => {
      mountedRef.current = false;
      listControllerRef.current?.abort();
    };
  }, [loadRequests]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const requestedName = form.requestedName.trim();
    if (requestedName.length < 2) {
      setError('Tên Brand phải có ít nhất 2 ký tự.');
      return;
    }
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await brandRequestsApi.create({
        requestedName,
        websiteUrl: form.websiteUrl.trim() || null,
        description: form.description.trim() || null,
      });
      if (!mountedRef.current) return;
      setForm({ requestedName: '', websiteUrl: '', description: '' });
      setSuccess('Đã gửi yêu cầu Brand.');
      await loadRequests();
    } catch (submitError) {
      if (mountedRef.current) setError(apiMessage(submitError, 'Gửi yêu cầu thất bại.'));
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Yêu cầu Brand</h1>
      <form onSubmit={submit} className="space-y-3 rounded border border-slate-800 p-4">
        <input required minLength={2} maxLength={200} disabled={isSubmitting} className="input-field w-full" placeholder="Tên Brand" value={form.requestedName} onChange={event => setForm({ ...form, requestedName: event.target.value })} />
        <input maxLength={500} disabled={isSubmitting} className="input-field w-full" type="url" placeholder="Website URL (không bắt buộc)" value={form.websiteUrl} onChange={event => setForm({ ...form, websiteUrl: event.target.value })} />
        <textarea maxLength={2000} disabled={isSubmitting} className="input-field w-full" placeholder="Mô tả" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-emerald-400">{success}</p>}
        <button disabled={isSubmitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </button>
      </form>
      {loading ? (
        <p>Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400">Bạn chưa có yêu cầu Brand nào.</p>
      ) : (
        <div className="space-y-2">
          {items.map(request => (
            <div key={request.id} className="rounded border border-slate-800 p-3">
              <strong>{request.requestedName}</strong>
              <span className="ml-3">{request.status}</span>
              <p>{new Date(request.createdAt).toLocaleString('vi-VN')}</p>
              {request.reviewReason && <p className="text-red-300">Lý do: {request.reviewReason}</p>}
              {request.resolvedBrand && <p className="text-emerald-300">Brand: {request.resolvedBrand.name}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
