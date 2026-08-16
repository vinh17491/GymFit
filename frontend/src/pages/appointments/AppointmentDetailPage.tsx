import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Loader2, UserCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { bookingSessionModeLabel, cancelMyBooking, getBookingById, type Booking } from '../../services/bookings';
import { bookingStatusLabel, displayCoachDate, displayCoachTime } from '../../utils/coachBooking';

const messageFor = (reason: unknown) => { const value = reason as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || 'Không thể xử lý lịch hẹn.'; };

export default function AppointmentDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!bookingId) return; setLoading(true); setError(''); try { setBooking(await getBookingById(bookingId)); } catch (reason: unknown) { setError(messageFor(reason)); } finally { setLoading(false); } }, [bookingId]);
  useEffect(() => { void load(); }, [load]);
  const cancel = async () => {
    if (!booking || cancelling || (booking.status !== 'pending' && booking.status !== 'confirmed') || !window.confirm('Hủy lịch hẹn này?')) return;
    setCancelling(true); setError('');
    try { setBooking(await cancelMyBooking(booking.id)); }
    catch (reason: unknown) { setError(messageFor(reason)); }
    finally { setCancelling(false); }
  };
  if (loading) return <div className="panel-state"><Loader2 size={18} className="mr-2 inline animate-spin" />Đang tải lịch hẹn...</div>;
  if (error && !booking) return <div className="panel-error"><p>{error}</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>;
  if (!booking) return <div className="panel-error"><p>Không tìm thấy lịch hẹn.</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>;
  return <div className="dashboard-page"><Link to="/appointments" className="mb-6 inline-flex items-center gap-2 text-[#94a3b8]"><ArrowLeft size={16} /> Lịch hẹn của tôi</Link><section className="max-w-2xl rounded-xl border border-[#1e293b] bg-[#0f172a] p-6"><p className="text-sm uppercase tracking-[0.16em] text-[#60a5fa]">Lịch hẹn #{booking.id}</p><h1 className="mt-2 text-2xl font-bold text-white">{booking.coach_name || `Coach #${booking.coach_id}`}</h1><div className="mt-6 space-y-3 text-[#cbd5e1]"><p><Calendar size={16} className="mr-2 inline text-[#60a5fa]" />{displayCoachDate(booking.booking_date)}</p><p><Clock size={16} className="mr-2 inline text-[#60a5fa]" />{displayCoachTime(booking.start_time)}–{displayCoachTime(booking.end_time)} · 60 phút · Asia/Ho_Chi_Minh</p><p><UserCircle size={16} className="mr-2 inline text-[#60a5fa]" />Trạng thái: {bookingStatusLabel[booking.status]}</p>{(booking.session_mode || booking.location) && <p>Hình thức: {booking.session_mode ? bookingSessionModeLabel[booking.session_mode] : 'Chưa ghi nhận'}{booking.location ? ` · ${booking.location}` : ''}</p>}{booking.notes && <p className="rounded-lg bg-[#020617] p-3 text-sm text-[#94a3b8]">{booking.notes}</p>}</div>{error && <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-6 flex flex-wrap gap-3">{(booking.status === 'pending' || booking.status === 'confirmed') && <button type="button" onClick={() => void cancel()} disabled={cancelling} className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 disabled:opacity-50">{cancelling ? 'Đang hủy...' : 'Hủy lịch hẹn'}</button>}<Link to="/appointments" className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-white">Quay lại</Link></div></section></div>;
}
