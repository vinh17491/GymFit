import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Calendar, Dumbbell, HeartPulse, ShoppingBag, Star, Ticket } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { DashboardPageHeader, DashboardPanel, EmptyState, MetricCard, PanelError, QuickAction, QuickStartCard } from '../../components/dashboard/DashboardPrimitives';
import { getMemberCurrent } from '../../services/memberWorkoutApi';
import { getBookingSummary, getBookingsPage, type Booking, type BookingSummary } from '../../services/bookings';
import api from '../../api/axios';
import type { MemberCurrent } from '../../types/memberWorkout';
import { bookingStatusLabel, displayCoachDate, displayCoachTime } from '../../utils/coachBooking';

interface LoyaltyPoints { balance: number }
const messageFor = (reason: unknown, fallback: string) => { const value = reason as { response?: { data?: { message?: string } }; message?: string }; return value.response?.data?.message || value.message || fallback; };

function MemberWorkoutWidget() {
  const [data, setData] = useState<MemberCurrent | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(() => { setLoading(true); setError(''); return getMemberCurrent().then(setData).catch((reason: unknown) => { const status = typeof reason === 'object' && reason !== null && 'response' in reason ? (reason as { response?: { status?: number } }).response?.status : undefined; if (status === 404) setData({ assignment: null, program: null, upcomingSchedules: [], activeSession: null }); else setError(messageFor(reason, 'Không thể tải dữ liệu workout.')); }).finally(() => setLoading(false)); }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <DashboardPanel title="Workout của bạn" description="Assignment và lịch execution thật"><div className="panel-state" aria-live="polite">Đang tải workout...</div></DashboardPanel>;
  if (error) return <DashboardPanel title="Workout của bạn" description="Độc lập với lịch hẹn Coach"><PanelError message={error} onRetry={() => void load()} /></DashboardPanel>;
  if (!data) return null;
  const target = data.activeSession ? `/workouts/sessions/${data.activeSession.id}` : '/workouts';
  return <DashboardPanel title="Workout của bạn" description="Tách biệt với Coach Appointment"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-lg font-semibold text-white">{data.activeSession ? `Đang tập · ${data.activeSession.program.name}` : data.assignment?.program_name || 'Chưa có assignment active'}</p><p className="mt-1 text-sm text-slate-400">{data.activeSession ? 'Tiếp tục session đang dở.' : data.assignment ? `${data.upcomingSchedules.length} lịch workout trong tài khoản.` : 'Chưa có assignment hiện tại.'}</p></div><Link className="primary-button inline-flex items-center gap-2" to={target}>{data.activeSession ? 'Tiếp tục' : 'Mở Workouts'} <ArrowRight size={15} /></Link></div></DashboardPanel>;
}

export default function DashboardPage() {
  const user = useAuthStore(state => state.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(null);
  const [points, setPoints] = useState<LoyaltyPoints | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(true); const [pointsLoading, setPointsLoading] = useState(true); const [bookingsError, setBookingsError] = useState(''); const [pointsError, setPointsError] = useState('');
  const loadBookings = useCallback(() => { setBookingsLoading(true); setBookingsError(''); return Promise.all([getBookingSummary(), getBookingsPage({ status: ['pending', 'confirmed'], page: 1, limit: 3 })]).then(([summary, page]) => { setBookingSummary(summary); setBookings(page.items); }).catch((reason: unknown) => setBookingsError(messageFor(reason, 'Không thể tải lịch hẹn.'))).finally(() => setBookingsLoading(false)); }, []);
  const loadPoints = useCallback(() => { setPointsLoading(true); setPointsError(''); return api.get<{ data: LoyaltyPoints }>('/loyalty/points').then(response => setPoints(response.data.data)).catch((reason: unknown) => setPointsError(messageFor(reason, 'Không thể tải điểm Loyalty.'))).finally(() => setPointsLoading(false)); }, []);
  useEffect(() => { void loadBookings(); }, [loadBookings]);
  useEffect(() => { void loadPoints(); }, [loadPoints]);
  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'coach') return <Navigate to="/coach" />;
  return <div className="dashboard-page"><DashboardPageHeader eyebrow="KHÔNG GIAN CÁ NHÂN" title={`Chào ${user?.name?.split(' ')[0] || 'bạn'}`} description="Theo dõi lịch hẹn Coach và workout của riêng bạn." action={<Link className="primary-button" to="/coaches">Đặt lịch Coach</Link>} />
    <div className="metric-grid"><MetricCard title="Điểm Loyalty" value={pointsLoading ? '—' : points?.balance ?? '—'} icon={<Star size={18} />} tone="amber" loading={pointsLoading} /><MetricCard title="Buổi đã hoàn thành" value={bookingsLoading ? '—' : bookingSummary?.completed ?? '—'} icon={<Dumbbell size={18} />} tone="lime" loading={bookingsLoading} /><MetricCard title="Lịch hẹn sắp tới" value={bookingsLoading ? '—' : bookingSummary?.upcoming ?? '—'} icon={<Calendar size={18} />} tone="blue" loading={bookingsLoading} /><MetricCard title="Trạng thái tài khoản" value="Đang hoạt động" icon={<HeartPulse size={18} />} tone="slate" /></div>
    <QuickStartCard title="Bắt đầu với GYMFIT" description="Ba bước ngắn để bắt đầu tập luyện và làm việc với Coach." steps={[{ to: '/coaches', title: 'Chọn Coach', description: 'Xem hồ sơ và lịch trống phù hợp.' }, { to: '/appointments', title: 'Đặt lịch', description: 'Theo dõi yêu cầu và trạng thái booking.' }, { to: '/workouts', title: 'Xem Workout', description: 'Mở chương trình và lịch tập của bạn.' }]} />
    <MemberWorkoutWidget />
    <div className="dashboard-grid-main"><DashboardPanel title="Lịch hẹn tiếp theo" description="Coach Appointment độc lập với lịch workout">{bookingsError ? <PanelError message={bookingsError} onRetry={() => void loadBookings()} /> : bookingsLoading ? <div className="panel-state">Đang tải lịch hẹn...</div> : bookings.length ? <div className="record-list">{bookings.map(item => <div className="record-row" key={item.id}><Calendar size={17} /><span><strong>{item.coach_name || `Coach #${item.coach_id}`}</strong><small>{displayCoachDate(item.booking_date)} · {displayCoachTime(item.start_time)} · {bookingStatusLabel[item.status]}</small></span><Link to={`/appointments/${item.id}`}>Xem</Link></div>)}</div> : <EmptyState title="Chưa có lịch hẹn sắp tới" description="Chọn Coach và gửi yêu cầu đặt lịch." action={<Link className="secondary-button" to="/coaches">Tìm Coach</Link>} />}</DashboardPanel><DashboardPanel title="Điểm Loyalty" description="Dữ liệu phần thưởng của tài khoản">{pointsError ? <PanelError message={pointsError} onRetry={() => void loadPoints()} /> : pointsLoading ? <div className="panel-state">Đang tải Loyalty...</div> : <div className="flex items-center justify-between gap-4"><div><p className="text-3xl font-semibold text-white">{points?.balance ?? 0}</p><p className="mt-2 text-sm text-slate-400">Điểm có thể sử dụng</p></div><Star className="text-amber-300" size={28} /></div>}</DashboardPanel></div>
    <DashboardPanel title="Tóm tắt cá nhân" description="Chỉ hiển thị dữ liệu thuộc tài khoản"><div className="quick-grid"><QuickAction to="/appointments" title="Lịch hẹn của tôi" description="Theo dõi trạng thái booking" icon={<Calendar size={18} />} /><QuickAction to="/orders" title="Đơn hàng của tôi" description="Xem lịch sử mua hàng" icon={<ShoppingBag size={18} />} /><QuickAction to="/tickets" title="Hỗ trợ" description="Gửi yêu cầu hỗ trợ" icon={<Ticket size={18} />} /></div></DashboardPanel>
  </div>;
}
