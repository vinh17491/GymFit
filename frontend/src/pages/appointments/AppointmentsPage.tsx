import { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, Loader2, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';
import { bookingSessionModeLabel, cancelMyBooking, getBookingsPage, type Booking, type BookingPage, type BookingStatus } from '../../services/bookings';
import { bookingStatusLabel, displayCoachDate, displayCoachTime } from '../../utils/coachBooking';

const statusTone: Record<BookingStatus, string> = { pending: 'bg-amber-500/15 text-amber-300', confirmed: 'bg-emerald-500/15 text-emerald-300', completed: 'bg-blue-500/15 text-blue-300', cancelled: 'bg-slate-700 text-slate-400', no_show: 'bg-red-500/15 text-red-300' };
const actionErrorMessage = (reason: unknown) => { const value = reason as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || 'Không thể hủy lịch hẹn.'; };

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: (id: number) => Promise<Booking> }) {
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const cancel = async () => {
    if (!canCancel || cancelling || !window.confirm('Hủy lịch hẹn này?')) return;
    setCancelling(true); setActionError('');
    try { await onCancel(booking.id); } catch (reason: unknown) { setActionError(actionErrorMessage(reason)); } finally { setCancelling(false); }
  };
  return <article className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="flex gap-4">{booking.coach_avatar_url ? <img src={booking.coach_avatar_url} alt={booking.coach_name || 'Coach'} className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] text-white"><UserCircle size={20} /></div>}<div><h2 className="font-semibold text-white">{booking.coach_name || `Coach #${booking.coach_id}`}</h2><p className="mt-1 flex items-center gap-2 text-sm text-[#94a3b8]"><Calendar size={14} />{displayCoachDate(booking.booking_date)}</p><p className="mt-1 flex items-center gap-2 text-sm text-[#94a3b8]"><Clock size={14} />{displayCoachTime(booking.start_time)}–{displayCoachTime(booking.end_time)}</p>{(booking.session_mode || booking.location) && <p className="mt-1 text-sm text-[#94a3b8]">{booking.session_mode ? bookingSessionModeLabel[booking.session_mode] : 'Hình thức chưa ghi nhận'}{booking.location ? ` · ${booking.location}` : ''}</p>}</div></div><span className={`h-fit rounded-full px-3 py-1 text-xs ${statusTone[booking.status]}`}>{bookingStatusLabel[booking.status]}</span></div>{booking.notes && <p className="mt-4 rounded-lg bg-[#020617] p-3 text-sm text-[#94a3b8]">{booking.notes}</p>}{actionError && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError}</p>}<div className="mt-5 flex gap-2"><Link to={`/appointments/${booking.id}`} className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-white hover:border-[#2563eb]">Xem chi tiết</Link>{canCancel && <button type="button" onClick={() => void cancel()} disabled={cancelling} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50">{cancelling ? 'Đang hủy...' : 'Hủy lịch'}</button>}</div></article>;
}

const emptyPage: BookingPage = { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };

export default function AppointmentsPage() {
  const [pageData, setPageData] = useState<BookingPage>(emptyPage);
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const status = tab === 'upcoming' ? ['pending', 'confirmed'] as BookingStatus[] : ['completed', 'cancelled', 'no_show'] as BookingStatus[];
    try { setPageData(await getBookingsPage({ status, page, limit: 20 })); } catch (reason: unknown) { const value = reason as { response?: { data?: { message?: string } }; message?: string }; setError(value.response?.data?.message || value.message || 'Không thể tải lịch hẹn.'); } finally { setLoading(false); }
  }, [page, tab]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);
  const cancel = async (id: number) => { const updated = await cancelMyBooking(id); await load(); return updated; };
  return <div className="dashboard-page"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm uppercase tracking-[0.16em] text-[#60a5fa]">Lịch hẹn Coach</p><h1 className="mt-2 text-3xl font-bold text-white">Lịch hẹn của tôi</h1><p className="mt-2 text-[#94a3b8]">Theo dõi yêu cầu đặt lịch và trạng thái xác nhận từ Coach.</p></div><Link to="/coaches" className="rounded-lg bg-[#2563eb] px-4 py-2 text-center text-sm font-semibold text-white">Tìm Coach</Link></div><div className="mb-6 flex gap-2"><button type="button" onClick={() => setTab('upcoming')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'upcoming' ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>Sắp tới</button><button type="button" onClick={() => setTab('history')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'history' ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-[#94a3b8]'}`}>Lịch sử</button></div>{loading && <div className="panel-state"><Loader2 size={18} className="mr-2 inline animate-spin" />Đang tải lịch hẹn...</div>}{!loading && error && <div className="panel-error"><p>{error}</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>}{!loading && !error && pageData.items.length === 0 && <div className="panel-state">Chưa có lịch hẹn trong mục này.</div>}{!loading && !error && pageData.items.length > 0 && <><div className="space-y-4">{pageData.items.map(booking => <BookingCard key={booking.id} booking={booking} onCancel={cancel} />)}</div><Pagination page={page} totalPages={pageData.totalPages} total={pageData.total} loading={loading} onPageChange={setPage} /></>}</div>;
}
