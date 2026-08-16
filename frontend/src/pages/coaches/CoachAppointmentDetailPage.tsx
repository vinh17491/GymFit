import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Check, Clock, Loader2, UserCircle, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { bookingSessionModeLabel, cancelCoachBooking, completeBooking, confirmBooking, getBookingById, markBookingNoShow, type Booking, type BookingStatus } from '../../services/bookings';
import { bookingStatusLabel, displayCoachDate, displayCoachTime, isCoachActionAllowed, type CoachBookingAction } from '../../utils/coachBooking';

const messageFor = (reason: unknown) => { const value = reason as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || 'Không thể xử lý lịch hẹn.'; };

export default function CoachAppointmentDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!bookingId) return; setLoading(true); setError(''); try { setBooking(await getBookingById(bookingId)); } catch (reason: unknown) { setError(messageFor(reason)); } finally { setLoading(false); } }, [bookingId]);
  useEffect(() => { void load(); }, [load]);
  const action = async (status: Exclude<BookingStatus, 'pending'>) => {
    if (!booking || busy || !isCoachActionAllowed(status as CoachBookingAction, booking.status, booking.booking_date, booking.start_time, booking.end_time)) return;
    if ((status === 'cancelled' || status === 'no_show') && !window.confirm(status === 'cancelled' ? 'Hủy lịch hẹn này?' : 'Đánh dấu học viên vắng mặt?')) return;
    setBusy(true); setError('');
    try { const updated = status === 'confirmed' ? await confirmBooking(booking.id) : status === 'completed' ? await completeBooking(booking.id) : status === 'no_show' ? await markBookingNoShow(booking.id) : await cancelCoachBooking(booking.id); setBooking(updated); }
    catch (reason: unknown) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="panel-state"><Loader2 size={18} className="mr-2 inline animate-spin" />Đang tải lịch hẹn...</div>;
  if (error && !booking) return <div className="panel-error"><p>{error}</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>;
  if (!booking) return <div className="panel-error"><p>Không tìm thấy lịch hẹn.</p><button type="button" onClick={() => void load()} className="secondary-button mt-3">Thử lại</button></div>;
  const canConfirm = isCoachActionAllowed('confirmed', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canComplete = isCoachActionAllowed('completed', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canNoShow = isCoachActionAllowed('no_show', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  const canCancel = isCoachActionAllowed('cancelled', booking.status, booking.booking_date, booking.start_time, booking.end_time);
  return <div className="dashboard-page"><Link to="/coach/appointments" className="mb-6 inline-flex items-center gap-2 text-[#94a3b8]"><ArrowLeft size={16} /> Lịch hẹn học viên</Link><section className="max-w-2xl rounded-xl border border-[#1e293b] bg-[#0f172a] p-6"><p className="text-sm uppercase tracking-[0.16em] text-[#60a5fa]">Lịch hẹn #{booking.id}</p><h1 className="mt-2 text-2xl font-bold text-white">{booking.member_name || `Member #${booking.member_id}`}</h1><div className="mt-6 space-y-3 text-[#cbd5e1]"><p><Calendar size={16} className="mr-2 inline text-[#60a5fa]" />{displayCoachDate(booking.booking_date)}</p><p><Clock size={16} className="mr-2 inline text-[#60a5fa]" />{displayCoachTime(booking.start_time)}–{displayCoachTime(booking.end_time)} · 60 phút · Asia/Ho_Chi_Minh</p><p><UserCircle size={16} className="mr-2 inline text-[#60a5fa]" />Trạng thái: {bookingStatusLabel[booking.status]}</p>{(booking.session_mode || booking.location) && <p>Hình thức: {booking.session_mode ? bookingSessionModeLabel[booking.session_mode] : 'Chưa ghi nhận'}{booking.location ? ` · ${booking.location}` : ''}</p>}{booking.notes && <p className="rounded-lg bg-[#020617] p-3 text-sm text-[#94a3b8]">{booking.notes}</p>}</div>{error && <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-6 flex flex-wrap gap-2">{canConfirm && <button type="button" disabled={busy} onClick={() => void action('confirmed')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Check size={15} /> Xác nhận</button>}{canComplete && <button type="button" disabled={busy} onClick={() => void action('completed')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">Hoàn thành</button>}{canNoShow && <button type="button" disabled={busy} onClick={() => void action('no_show')} className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 disabled:opacity-50">Vắng mặt</button>}{canCancel && <button type="button" disabled={busy} onClick={() => void action('cancelled')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><X size={15} /> Hủy</button>}{busy && <Loader2 size={18} className="self-center animate-spin text-slate-400" />}</div></section></div>;
}
