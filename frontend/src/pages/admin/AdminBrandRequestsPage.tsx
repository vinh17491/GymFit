import axios from 'axios';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  BrandRequest,
  BrandRequestDetail,
  BrandRequestStatus,
  brandRequestsApi,
} from '../../services/brandRequestsApi';

const apiMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

export default function AdminBrandRequestsPage() {
  const [items, setItems] = useState<BrandRequest[]>([]);
  const [selected, setSelected] = useState<BrandRequestDetail | null>(null);
  const [status, setStatus] = useState<BrandRequestStatus>('PENDING');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);
  const listControllerRef = useRef<AbortController | null>(null);
  const detailControllerRef = useRef<AbortController | null>(null);

  const loadRequests = useCallback(async (nextStatus: BrandRequestStatus, nextSearch: string) => {
    listControllerRef.current?.abort();
    const controller = new AbortController();
    listControllerRef.current = controller;
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await brandRequestsApi.adminList({
        status: nextStatus,
        search: nextSearch || undefined,
        page: 1,
        limit: 50,
        sortOrder: 'desc',
      }, controller.signal);
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
    void loadRequests(status, appliedSearch);
    return () => {
      mountedRef.current = false;
      listControllerRef.current?.abort();
      detailControllerRef.current?.abort();
    };
  }, [appliedSearch, loadRequests, status]);

  const find = (event: FormEvent) => {
    event.preventDefault();
    const normalizedSearch = search.trim();
    if (normalizedSearch === appliedSearch) void loadRequests(status, normalizedSearch);
    else setAppliedSearch(normalizedSearch);
  };

  const open = async (id: number) => {
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    setError('');
    setIsOpening(true);
    try {
      const response = await brandRequestsApi.adminDetail(id, controller.signal);
      if (mountedRef.current && !controller.signal.aborted) {
        setSelected(response.data.data);
        setReason('');
      }
    } catch (detailError) {
      if (mountedRef.current && !controller.signal.aborted) {
        setError(apiMessage(detailError, 'Không thể tải chi tiết yêu cầu.'));
      }
    } finally {
      if (mountedRef.current && detailControllerRef.current === controller) setIsOpening(false);
    }
  };

  const approve = async () => {
    if (!selected || selected.status !== 'PENDING' || isProcessing) return;
    setError('');
    setIsProcessing(true);
    try {
      await brandRequestsApi.approve(selected.id);
      if (!mountedRef.current) return;
      setSelected(null);
      await loadRequests(status, appliedSearch);
    } catch (approveError) {
      if (mountedRef.current) setError(apiMessage(approveError, 'Approve thất bại.'));
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  const reject = async () => {
    if (!selected || selected.status !== 'PENDING' || isProcessing) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Lý do reject là bắt buộc.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      await brandRequestsApi.reject(selected.id, trimmedReason);
      if (!mountedRef.current) return;
      setSelected(null);
      setReason('');
      await loadRequests(status, appliedSearch);
    } catch (rejectError) {
      if (mountedRef.current) setError(apiMessage(rejectError, 'Reject thất bại.'));
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  return (
    <section className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">Brand Requests</h1>
      <form className="flex gap-2" onSubmit={find}>
        <input maxLength={200} className="input-field" placeholder="Brand, email, Shop" value={search} onChange={event => setSearch(event.target.value)} />
        <select className="input-field" value={status} onChange={event => setStatus(event.target.value as BrandRequestStatus)}>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button disabled={loading} className="disabled:cursor-not-allowed disabled:opacity-60">Tìm</button>
      </form>
      {error && <p className="text-red-400">{error}</p>}
      {loading ? (
        <p>Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400">Không có yêu cầu phù hợp.</p>
      ) : (
        <div className="space-y-2">
          {items.map(request => (
            <button disabled={isOpening || isProcessing} className="block w-full rounded border border-slate-800 p-3 text-left disabled:cursor-not-allowed disabled:opacity-60" key={request.id} onClick={() => void open(request.id)}>
              <strong>{request.requestedName}</strong> · {request.status}
              <span className="block text-slate-400">{request.shopName} — {request.requesterEmail}</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="rounded border border-emerald-800 p-4">
          <h2 className="text-xl font-bold">{selected.requestedName}</h2>
          <p>{selected.description}</p>
          <p>Shop: {selected.shopName}; Seller: {selected.requesterEmail}</p>
          {selected.reviewedAt && <p>Reviewed: {new Date(selected.reviewedAt).toLocaleString('vi-VN')} {selected.reviewerName ? `— ${selected.reviewerName}` : ''}</p>}
          {selected.reviewReason && <p className="text-red-300">Lý do: {selected.reviewReason}</p>}
          {selected.status === 'PENDING' && (
            <div className="mt-3 flex gap-3">
              <button disabled={isProcessing} className="disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void approve()}>
                {isProcessing ? 'Đang xử lý…' : 'Approve'}
              </button>
              <input maxLength={1000} disabled={isProcessing} className="input-field" placeholder="Reject reason" value={reason} onChange={event => setReason(event.target.value)} />
              <button disabled={isProcessing || !reason.trim()} className="disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void reject()}>
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
