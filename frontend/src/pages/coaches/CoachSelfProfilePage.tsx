import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save, UserCircle } from 'lucide-react';
import { getMyCoachProfile, updateMyCoachProfile, type CoachSelfProfile } from '../../services/coaches';

const errorMessage = (reason: unknown) => {
  const value = reason as { response?: { data?: { message?: string } }; message?: string };
  return value.response?.data?.message || value.message || 'Không thể tải hồ sơ Coach.';
};

export default function CoachSelfProfilePage() {
  const [profile, setProfile] = useState<CoachSelfProfile | null>(null);
  const [form, setForm] = useState({ specialty: '', bio: '', experienceYears: '', sessionMode: '', location: '', bookingEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const value = await getMyCoachProfile();
      setProfile(value);
      setForm({
        specialty: value.specialty || '',
        bio: value.bio || '',
        experienceYears: value.experienceYears === null ? '' : String(value.experienceYears),
        sessionMode: value.sessionMode || '',
        location: value.location || '',
        bookingEnabled: value.bookingEnabled,
      });
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const value = await updateMyCoachProfile({
        specialty: form.specialty,
        bio: form.bio,
        experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
        sessionMode: form.sessionMode === '' ? null : form.sessionMode as 'ONLINE' | 'IN_PERSON' | 'BOTH',
        location: form.location,
        bookingEnabled: form.bookingEnabled,
      });
      setProfile(value);
      setSuccess('Đã lưu hồ sơ Coach.');
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={20} />Đang tải hồ sơ Coach...</div>;
  if (!profile) return <div className="mx-auto max-w-3xl py-12"><div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200"><p>{error || 'Không tìm thấy hồ sơ Coach.'}</p><button className="mt-4 rounded-lg border border-red-300/40 px-4 py-2 text-sm" onClick={() => void load()}>Thử lại</button></div></div>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-xs uppercase tracking-[0.18em] text-lime-300">Coach workspace</p><h1 className="mt-2 text-3xl font-semibold text-white">Hồ sơ Coach</h1><p className="mt-2 text-sm text-slate-400">Cập nhật thông tin hiển thị công khai và trạng thái nhận lịch hẹn.</p></header>
    <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={17} />{success}</div>}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5"><div className="grid h-12 w-12 place-items-center rounded-xl bg-lime-300/10 text-lime-300"><UserCircle size={25} /></div><div><p className="font-medium text-white">{profile.name}</p><p className="text-xs text-slate-400">ID Coach: {profile.coachId}</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">Chuyên môn<input value={form.specialty} onChange={event => setForm(current => ({ ...current, specialty: event.target.value }))} maxLength={200} className="input-field w-full px-3" placeholder="Ví dụ: Strength & Conditioning" /></label>
        <label className="space-y-2 text-sm text-slate-300">Kinh nghiệm (năm)<input type="number" min={0} max={80} value={form.experienceYears} onChange={event => setForm(current => ({ ...current, experienceYears: event.target.value }))} className="input-field w-full px-3" /></label>
        <label className="space-y-2 text-sm text-slate-300">Hình thức tập<select value={form.sessionMode} onChange={event => setForm(current => ({ ...current, sessionMode: event.target.value }))} className="input-field w-full px-3"><option value="">Chưa chọn</option><option value="ONLINE">Online</option><option value="IN_PERSON">Tại phòng tập</option><option value="BOTH">Online & tại phòng tập</option></select></label>
        <label className="space-y-2 text-sm text-slate-300">Địa điểm<input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} maxLength={255} className="input-field w-full px-3" placeholder="Phòng tập hoặc khu vực" /></label>
      </div>
      <label className="block space-y-2 text-sm text-slate-300">Giới thiệu<textarea value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} maxLength={2000} rows={6} className="input-field w-full px-3 py-3 resize-y" placeholder="Giới thiệu kinh nghiệm và phương pháp huấn luyện" /></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><input type="checkbox" checked={form.bookingEnabled} onChange={event => setForm(current => ({ ...current, bookingEnabled: event.target.checked }))} className="mt-1 h-4 w-4 accent-lime-300" /><span><span className="block font-medium text-white">Mở nhận lịch hẹn</span><span className="mt-1 block text-xs leading-5 text-slate-400">Tắt để ẩn khả năng đặt lịch mới. Booking đã tạo vẫn tuân theo trạng thái hiện tại ở backend.</span></span></label>
      <div className="flex justify-end"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button></div>
    </form>
  </div>;
}
