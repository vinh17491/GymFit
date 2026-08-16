import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ClipboardList, History, LineChart, Loader2, Lock, Save, UserCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getMember, getMemberContext, updateMemberContext } from '../../services/coachWorkspaceApi';
import type { CoachMemberContextResponse, CoachMemberDetail } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, inputClass, LoadingState } from './CoachCommon';

type ContextDraft = {
  goal: string;
  limitations: string;
  privateNote: string;
  nextReviewDate: string;
};

const emptyDraft: ContextDraft = { goal: '', limitations: '', privateNote: '', nextReviewDate: '' };

const toDraft = (response: CoachMemberContextResponse): ContextDraft => response.context ? {
  goal: response.context.goal || '',
  limitations: response.context.limitations || '',
  privateNote: response.context.private_note || '',
  nextReviewDate: response.context.next_review_date || '',
} : { ...emptyDraft };

const apiError = (reason: unknown): { status?: number; code?: string; message: string } => {
  const value = reason as { response?: { status?: number; data?: { message?: string; errors?: { code?: string } } }; message?: string };
  return {
    status: value.response?.status,
    code: value.response?.data?.errors?.code,
    message: value.response?.data?.message || value.message || 'Không thể tải Member context.',
  };
};

export default function CoachMemberDetailPage() {
  const { memberId } = useParams();
  const numericMemberId = Number(memberId);
  const [member, setMember] = useState<CoachMemberDetail | null>(null);
  const [context, setContext] = useState<CoachMemberContextResponse | null>(null);
  const [draft, setDraft] = useState<ContextDraft>({ ...emptyDraft });
  const [savedDraft, setSavedDraft] = useState<ContextDraft>({ ...emptyDraft });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDraft), [draft, savedDraft]);

  const load = useCallback(async () => {
    if (!Number.isInteger(numericMemberId) || numericMemberId <= 0) {
      setError('Member ID không hợp lệ.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setConflict(false);
    try {
      const [memberValue, contextValue] = await Promise.all([getMember(numericMemberId), getMemberContext(numericMemberId)]);
      const nextDraft = toDraft(contextValue);
      setMember(memberValue);
      setContext(contextValue);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
    } catch (reason: unknown) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
    }
  }, [numericMemberId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const updateDraft = (field: keyof ContextDraft, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setSuccess('');
    setConflict(false);
  };

  const saveContext = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || context.readOnly || !dirty) return;
    setSaving(true);
    setError('');
    setSuccess('');
    setConflict(false);
    try {
      const saved = await updateMemberContext(numericMemberId, {
        goal: draft.goal || null,
        limitations: draft.limitations || null,
        privateNote: draft.privateNote || null,
        nextReviewDate: draft.nextReviewDate || null,
        expectedUpdatedAt: context.context?.updated_at || null,
      });
      const nextDraft = toDraft(saved);
      setContext(saved);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setSuccess('Đã lưu Member context.');
    } catch (reason: unknown) {
      const failure = apiError(reason);
      if (failure.status === 409 || failure.code === 'COACH_CONTEXT_CONFLICT') {
        setConflict(true);
        setError('Context đã được thay đổi ở nơi khác. Kiểm tra bản mới rồi lưu lại để tránh ghi đè dữ liệu.');
      } else setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CoachPage title="Member" description="Đang tải Member context trong Coach scope." backTo="/coach/members"><LoadingState /></CoachPage>;
  if (!member || !context) return <CoachPage title="Member" description="Member detail và private context trong active Coach scope." backTo="/coach/members"><ErrorState message={error || 'Member không tồn tại trong scope hiện tại.'} retry={() => void load()} /></CoachPage>;

  const readOnly = context.readOnly;

  return <CoachPage title={member.name} description="Member detail và private context trong active Coach scope." backTo="/coach/members">
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="dashboard-panel">
        <div className="flex items-center gap-3">
          <span className="quick-icon"><UserCircle size={19} /></span>
          <div><h2 className="text-xl font-semibold text-white">{member.name}</h2><p className="text-sm text-slate-400">{member.email}</p></div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Phone</dt><dd className="text-white">{member.phone || '—'}</dd></div>
          <div><dt className="text-slate-500">Legacy sessions</dt><dd className="text-white">{member.sessionCount}</dd></div>
        </dl>
      </div>
      <div className="dashboard-panel">
        <h2 className="text-lg font-semibold text-white">Current assignment</h2>
        {member.currentAssignment ? <div className="mt-4"><p className="font-medium text-white">{member.currentAssignment.program_name}</p><p className="mt-1 text-sm text-slate-400">{member.currentAssignment.status} · {member.currentAssignment.schedule_timezone}</p><Link className="primary-button mt-4 inline-flex" to={`/coach/assignments/${member.currentAssignment.id}`}>Mở assignment</Link></div> : <p className="mt-4 text-sm text-slate-500">Member chưa có assignment.</p>}
      </div>
    </div>

    <form onSubmit={saveContext} className="dashboard-panel mt-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Lock size={17} className="text-emerald-300" /><h2 className="text-lg font-semibold text-white">Goals and private context</h2></div><p className="mt-1 text-sm text-slate-400">Chỉ Coach trong scope được phép đọc/sửa. Private note không hiển thị cho Member hoặc Admin.</p></div>
        <span className={`rounded-full px-3 py-1 text-xs ${readOnly ? 'bg-amber-400/10 text-amber-200' : 'bg-emerald-400/10 text-emerald-200'}`}>{readOnly ? 'Read-only sau reassignment' : 'Editable'}</span>
      </div>
      {readOnly && <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Bạn là Coach trước đây của Member này. Context lịch sử chỉ được đọc; Coach hiện tại có context riêng.</div>}
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}{conflict && <button type="button" className="ml-3 underline" onClick={() => void load()}>Tải bản mới</button>}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={17} />{success}</div>}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm text-slate-300">Goal<textarea rows={4} maxLength={2000} disabled={readOnly || saving} value={draft.goal} onChange={event => updateDraft('goal', event.target.value)} className={`${inputClass} mt-2 resize-y`} placeholder="Mục tiêu tập luyện đã thống nhất" /></label>
        <label className="block text-sm text-slate-300">Limitations<textarea rows={4} maxLength={2000} disabled={readOnly || saving} value={draft.limitations} onChange={event => updateDraft('limitations', event.target.value)} className={`${inputClass} mt-2 resize-y`} placeholder="Giới hạn cần lưu ý khi coaching" /></label>
        <label className="block text-sm text-slate-300 md:col-span-2">Private note<textarea rows={5} maxLength={4000} disabled={readOnly || saving} value={draft.privateNote} onChange={event => updateDraft('privateNote', event.target.value)} className={`${inputClass} mt-2 resize-y`} placeholder="Ghi chú riêng cho Coach" /></label>
        <label className="block text-sm text-slate-300">Next review date<input type="date" disabled={readOnly || saving} value={draft.nextReviewDate} onChange={event => updateDraft('nextReviewDate', event.target.value)} className={`${inputClass} mt-2`} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4"><span className="text-xs text-slate-500">{dirty ? 'Có thay đổi chưa lưu.' : 'Đã đồng bộ với backend.'}</span><button type="submit" disabled={readOnly || saving || !dirty} className="primary-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{saving ? 'Đang lưu...' : 'Lưu context'}</button></div>
    </form>

    <div className="dashboard-panel mt-6"><h2 className="text-lg font-semibold text-white">Monitoring</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><Link className="quick-action" to={`/coach/members/${member.id}/schedule`}><Calendar size={18} /><span><strong>Schedule</strong><small>Lịch tương lai</small></span></Link><Link className="quick-action" to={`/coach/members/${member.id}/sessions`}><History size={18} /><span><strong>Session history</strong><small>Read-only</small></span></Link><Link className="quick-action" to={`/coach/members/${member.id}/progress`}><LineChart size={18} /><span><strong>Progress</strong><small>Summary thật</small></span></Link><Link className="quick-action" to={`/coach/assignments?memberId=${member.id}`}><ClipboardList size={18} /><span><strong>Assignments</strong><small>Scope-limited</small></span></Link></div></div>
  </CoachPage>;
}
