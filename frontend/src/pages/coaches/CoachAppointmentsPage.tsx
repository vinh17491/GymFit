import { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, Clock, Loader2, UserCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { bookingSessionModeLabel, cancelCoachBooking, completeBooking, confirmBooking, getBookingSummary, getCoachAppointmentsPage, markBookingNoShow, type Booking, type BookingPage, type BookingStatus, type BookingSummary } from '../../services/bookings';
import { bookingStatusLabel, displayCoachDate, displayCoachTime, isCoachActionAllowed, type CoachBookingAction } from '../../utils/coachBooking';

const tone: Record<BookingStatus, string> = { pending: 'bg-amber-500/15 text-amber-300', confirmed: 'bg-emerald-500/15 text-emerald-300', completed: 'bg-blue-500/15 text-blue-300', cancelled: 'bg-slate-700 text-slate-400', no_show: 'bg-red-500/15 text-red-300' };
const messageFor = (reason: unknown) => { const value = reason as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || 'Không thể cập nhật lịch hẹn.'; };

function AppointmentRow({ booking, onAction }: { booking: Booking; onAction: (id: number, status: Exclude<BookingStatus, 'pending'>) => Promise<Booking> }) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const run = async (status: Exclude<BookingStatus, 'pending'>) => {
    if (busy || !isCoachActionAllowed(status as CoachBookingAction, booking.status, booking.booking_date, booking.start_time, booking.end_time)) return;
    if ((status === 'cancelled' || status === 'no_show') && !window.confirm(status === 'cancelled' ? 'Hủy lịch hẹn này?' : 'Đánh dấu học viên vắng mặt?')) return;
    setBusy(true); setActionError('');
    try { await onAction(booking.id, status); } catch (reason: unknown) { setActionError(messageFor(reason)); } finally { setBusy(false); }
  };
  const canConfirm = isCoachActionAllowed('confirmed', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canComplete = isCoachActionAllowed('completed', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canNoShow = isCoachActionAllowed('no_show', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canCancel = isCoachActionAllowed('cancelled', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  return <article className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] text-white"><UserCircle size={20} /></div><div><h2 className="font-semibold text-white">{booking.member_name || `Member #${booking.member_id}`}</h2><p className="mt-1 flex items-center gap-2 text-sm text-[#94a3b8]"><Calendar size={14} />{displayCoachDate(booking.booking_date)}</p><p className="mt-1 flex items-center gap-2 text-sm text-[#94a3b8]"><Clock size={14} />{displayCoachTime(booking.start_time)}–{displayCoachTime(booking.end_time)}</p>{(booking.session_mode || booking.location) && <p className="mt-1 text-sm text-[#94a3b8]">{booking.session_mode ? bookingSessionModeLabel[booking.session_mode] : 'Hình thức chưa ghi nhận'}{booking.location ? ` · ${booking.location}` : ''}</p>}</div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs ${tone[booking.status]}`}>{bookingStatusLabel[booking.status]}</span>{canConfirm && <button type="button" disabled={busy} onClick={() => void run('confirmed')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white disabled:opacity-50"><Check size={14} /> Xác nhận</button>}{canComplete && <button type="button" disabled={busy} onClick={() => void run('completed')} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-50">Hoàn thành</button>}{canNoShow && <button type="button" disabled={busy} onClick={() => void run('no_show')} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 disabled:opacity-50">Vắng mặt</button>}{canCancel && <button type="button" disabled={busy} onClick={() => void run('cancelled')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><X size={14} /> Hủy</button>}{busy && <Loader2 size={16} className="animate-spin text-slate-400" />}</div></div>{booking.notes && <p className="mt-4 rounded-lg bg-[#020617] p-3 text-sm text-[#94a3b8]">{booking.notes}</p>}{actionError && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError}</p>}<Link to={`/coach/appointments/${booking.id}`} className="mt-4 inline-block text-sm text-[#60a5fa]">Xem chi tiết</Link></article>;
}

const emptyPage: BookingPage = { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };

export default function CoachAppointmentsPage() {
  const [pageData, setPageData] = useState<BookingPage>(emptyPage);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [tab, setTab] = useState<'pending' | 'upcoming' | 'history'>('pending');
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    const status = tab === 'pending' ? 'pending' : tab === 'upcoming' ? 'confirmed' : ['completed', 'cancelled', 'no_show'] as BookingStatus[];
    try {
      const [rows, totals] = await Promise.all([
        getCoachAppointmentsPage({ status, fromDate: fromDate || undefined, toDate: toDate || undefined, page, limit: 20 }, { signal }),
        getBookingSummary({ fromDate: fromDate || undefined, toDate: toDate || undefined }, { signal }),
      ]);
      setPageData(rows); setSummary(totals);
    } catch (reason: unknown) { if (!signal?.aborted) setError(messageFor(reason)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [fromDate, page, tab, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => { setPage(1); }, [tab, fromDate, toDate]);

  const action = async (id: number, status: Exclude<BookingStatus, 'pending'>) => {
    const updated = status === 'confirmed' ? await confirmBooking(id) : status === 'completed' ? await completeBooking(id) : status === 'no_show' ? await markBookingNoShow(id) : await cancelCoachBooking(id);
    await load();
    return updated;
  };

  return <div className="dashboard-page"><div className="mb-8"><p className="text-sm uppercase tracking-[0.16em] text-[#60a5fa]">Coach Workspace</p><h1 className="mt-2 text-3xl font-bold text-white">Lịch hẹn học viên</h1><p className="mt-2 text-[#94a3b8]">Xử lý booking trên server theo scope Coach, trạng thái và khoảng ngày.</p></div>
    {summary && <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="dashboard-panel"><p className="text-xs uppercase text-slate-500">Pending</p><strong className="mt-2 block text-2xl text-amber-300">{summary.pending}</strong></div><div className="dashboard-panel"><p className="text-xs uppercase text-slate-500">Confirmed upcoming</p><strong className="mt-2 block text-2xl text-emerald-300">{summary.upcoming}</strong></div><div className="dashboard-panel"><p className="text-xs uppercase text-slate-500">Today</p><strong className="mt-2 block text-2xl text-blue-300">{summary.today}</strong><small className="text-slate-500">{summary.asOfDate} · {summary.timezone}</small></div><div className="dashboard-panel"><p className="text-xs uppercase text-slate-500">Completed</p><strong className="mt-2 block text-2xl text-slate-200">{summary.completed}</strong></div></div>}
    <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><label className="text-sm text-slate-400">Từ ngày<input className="input-field mt-1 w-full" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label className="text-sm text-slate-400">Đến ngày<input className="input-field mt-1 w-full" type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label><button type="button" className="secondary-button self-end" onClick={() => void load()}>Làm mới</button></div>
    <div className="mb-6 flex flex-wrap gap-2"><button type="button" onClick={() => setTab('pending')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'pending' ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>Yêu cầu mới</button><button type="button" onClick={() => setTab('upcoming')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'upcoming' ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>Sắp tới</button><button type="button" onClick={() => setTab('history')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'history' ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>Lịch sử</button></div>
    {loading && <div className="panel-state"><Loader2 size={18} className="mr-2 inline animate-spin" />Đang tải...</div>}{!loading && error && <div className="panel-error"><p>{error}</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>}{!loading && !error && pageData.items.length === 0 && <div className="panel-state">Không có lịch hẹn trong mục này.</div>}{!loading && !error && pageData.items.length > 0 && <><div className="space-y-4">{pageData.items.map(booking => <AppointmentRow key={booking.id} booking={booking} onAction={action} />)}</div><Pagination page={page} totalPages={pageData.totalPages} total={pageData.total} loading={loading} onPageChange={setPage} /></>}
  </div>;
}
