import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, UserCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getPublicCoach, type Coach } from '../../services/coaches';
import { useAuthStore } from '../../stores/authStore';

function initials(name: string): string {
  return name.split(/\s+/).map(part => part[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export default function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore(state => state.user);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try { setCoach(await getPublicCoach(id)); }
    catch (reason: unknown) {
      const value = reason as { response?: { data?: { message?: string } }; message?: string };
      setError(value.response?.data?.message || value.message || 'Không thể tải hồ sơ Coach.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#020617] text-[#94a3b8]"><Loader2 className="mr-3 animate-spin text-[#2563eb]" />Đang tải hồ sơ Coach...</div>;
  if (error || !coach) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] text-center"><p className="text-red-300">{error || 'Không tìm thấy Coach.'}</p><button onClick={() => void load()} className="rounded-lg bg-[#2563eb] px-5 py-2 text-white">Thử lại</button><Link to="/coaches" className="text-[#60a5fa]">Quay lại danh sách</Link></div>;

  const canBook = coach.bookingEnabled && user?.role === 'member';

  return <div className="min-h-screen bg-[#020617] py-20"><div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
    <Link to="/coaches" className="mb-8 inline-flex items-center gap-2 text-[#94a3b8] hover:text-white"><ArrowLeft size={16} /> Tất cả Coach</Link>
    <section className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {coach.avatarUrl ? <img src={coach.avatarUrl} alt={coach.name} className="h-28 w-28 rounded-full object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] text-3xl font-bold text-white">{initials(coach.name)}</div>}
        <div className="flex-1"><h1 className="text-3xl font-bold text-white">{coach.name}</h1><p className="mt-2 text-lg text-[#60a5fa]">{coach.specialty || 'Coach thể hình'}</p><div className="mt-4 flex flex-wrap gap-4 text-sm text-[#94a3b8]">{coach.location && <span className="inline-flex items-center gap-2"><MapPin size={15} />{coach.location}</span>}{coach.experienceYears !== null && <span className="inline-flex items-center gap-2"><Clock size={15} />{coach.experienceYears} năm kinh nghiệm</span>}{coach.sessionMode && <span className="inline-flex items-center gap-2"><UserCircle size={15} />{coach.sessionMode === 'BOTH' ? 'Online & tại phòng tập' : coach.sessionMode === 'ONLINE' ? 'Online' : 'Tại phòng tập'}</span>}</div></div>
      </div>
      <div className="mt-8 border-t border-[#1e293b] pt-6"><h2 className="text-xl font-semibold text-white">Giới thiệu</h2><p className="mt-3 whitespace-pre-line leading-7 text-[#94a3b8]">{coach.bio || 'Coach chưa thêm phần giới thiệu.'}</p></div>
      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#1e293b] bg-[#020617]/60 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-white">Đặt lịch hẹn Coach</p><p className="mt-1 text-sm text-[#94a3b8]">Mỗi lịch hẹn có thời lượng cố định 60 phút, theo múi giờ Asia/Ho_Chi_Minh.</p></div>{!coach.bookingEnabled ? <span className="text-sm text-slate-500">Coach hiện chưa mở đặt lịch.</span> : canBook ? <Link to={`/coaches/${coach.id}/book`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 font-semibold text-white hover:bg-[#1d4ed8]"><Calendar size={17} /> Đặt lịch Coach</Link> : !user ? <Link to={`/coaches/${coach.id}/book`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 font-semibold text-white hover:bg-[#1d4ed8]"><Calendar size={17} /> Đăng nhập để đặt lịch</Link> : <span className="text-sm text-slate-500">Tài khoản này không thể tạo booking Member.</span>}</div>
    </section>
  </div></div>;
}
