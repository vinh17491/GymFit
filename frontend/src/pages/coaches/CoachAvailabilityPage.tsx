import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Loader2, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { CoachPage, ErrorState, inputClass } from './CoachCommon';
import {
  createMyAvailabilityException,
  createMyAvailabilityRule,
  deleteMyAvailabilityException,
  deleteMyAvailabilityRule,
  getMyCoachAvailability,
  listMyAvailabilityExceptions,
  listMyAvailabilityRules,
  type CoachAvailability,
  type CoachAvailabilityException,
  type CoachAvailabilityRule,
  type CoachSessionMode,
} from '../../services/coaches';
import { coachDateOptions, todayInCoachTimeZone } from '../../utils/coachBooking';

const weekdays = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];
const modes: Array<{ value: CoachSessionMode; label: string }> = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'BOTH', label: 'Online + in person' },
];

const errorMessage = (reason: unknown): string => {
  const value = reason as { code?: string; response?: { status?: number; data?: { message?: string } }; message?: string };
  if (value.code === 'ERR_CANCELED') return '';
  if (value.response?.status === 409) return value.response.data?.message || 'This window conflicts with existing availability or booking state.';
  return value.response?.data?.message || value.message || 'Unable to update Coach availability.';
};

const dayLabel = (value: number): string => weekdays.find(day => day.value === value)?.label || `Day ${value}`;
const modeLabel = (value: CoachSessionMode | null): string => modes.find(mode => mode.value === value)?.label || 'Any mode';
const validRange = (start: string, end: string): boolean => /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;

export default function CoachAvailabilityPage() {
  const previewDates = useMemo(() => coachDateOptions(14), []);
  const [previewDate, setPreviewDate] = useState(todayInCoachTimeZone());
  const [availability, setAvailability] = useState<CoachAvailability | null>(null);
  const [rules, setRules] = useState<CoachAvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<CoachAvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const previewAbort = useRef<AbortController | null>(null);

  const [ruleForm, setRuleForm] = useState({ weekday: 1, startTime: '09:00', endTime: '10:00', mode: 'BOTH' as CoachSessionMode, location: '' });
  const [exceptionForm, setExceptionForm] = useState({ exceptionDate: todayInCoachTimeZone(), exceptionType: 'BLOCK' as 'BLOCK' | 'OPEN', startTime: '09:00', endTime: '10:00', mode: 'BOTH' as CoachSessionMode, location: '', note: '' });

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleRows, exceptionRows] = await Promise.all([listMyAvailabilityRules(), listMyAvailabilityExceptions()]);
      setRules(ruleRows);
      setExceptions(exceptionRows);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally { setLoading(false); }
  }, []);

  const loadPreview = useCallback(async (date: string) => {
    previewAbort.current?.abort();
    const controller = new AbortController();
    previewAbort.current = controller;
    setPreviewLoading(true);
    try {
      const value = await getMyCoachAvailability(date, controller.signal);
      setAvailability(value);
    } catch (reason: unknown) {
      const message = errorMessage(reason);
      if (message) setError(message);
    } finally {
      if (!controller.signal.aborted) setPreviewLoading(false);
    }
  }, []);

  useEffect(() => { void loadLists(); return () => previewAbort.current?.abort(); }, [loadLists]);
  useEffect(() => { void loadPreview(previewDate); }, [loadPreview, previewDate]);

  const refresh = async (message: string) => {
    setError('');
    setSuccess('');
    await Promise.all([loadLists(), loadPreview(previewDate)]);
    setSuccess(message);
  };

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!validRange(ruleForm.startTime, ruleForm.endTime)) { setError('Rule start time must be before end time.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await createMyAvailabilityRule({ ...ruleForm, location: ruleForm.location.trim() || null });
      setRuleForm(current => ({ ...current, startTime: '09:00', endTime: '10:00' }));
      await refresh('Weekly availability rule saved.');
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const submitException = async (event: FormEvent) => {
    event.preventDefault();
    if (exceptionForm.exceptionType === 'OPEN' && !validRange(exceptionForm.startTime, exceptionForm.endTime)) { setError('Open exception start time must be before end time.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await createMyAvailabilityException({
        exceptionDate: exceptionForm.exceptionDate,
        exceptionType: exceptionForm.exceptionType,
        startTime: exceptionForm.exceptionType === 'OPEN' ? exceptionForm.startTime : null,
        endTime: exceptionForm.exceptionType === 'OPEN' ? exceptionForm.endTime : null,
        mode: exceptionForm.exceptionType === 'OPEN' ? exceptionForm.mode : null,
        location: exceptionForm.location.trim() || null,
        note: exceptionForm.note.trim() || null,
      });
      await refresh('Date exception saved.');
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const removeRule = async (rule: CoachAvailabilityRule) => {
    if (!window.confirm(`Delete ${dayLabel(rule.weekday)} ${rule.start_time}-${rule.end_time}?`)) return;
    setSaving(true); setError('');
    try { await deleteMyAvailabilityRule(rule.id); await refresh('Weekly rule deleted.'); }
    catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const removeException = async (exception: CoachAvailabilityException) => {
    if (!window.confirm(`Delete ${exception.exception_type} exception on ${exception.exception_date}?`)) return;
    setSaving(true); setError('');
    try { await deleteMyAvailabilityException(exception.id); await refresh('Date exception deleted.'); }
    catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const previewSlots = availability?.slots?.filter(slot => !slot.booked && !slot.past) || [];

  return <CoachPage title="Availability" description="Configure recurring windows, exceptions and the real slots members can book.">
    {(error || success) && <div className={`mb-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`} role={error ? 'alert' : 'status'}>{error ? <span>{error}</span> : <><CheckCircle2 size={17} />{success}</>}</div>}
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="dashboard-panel">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="dashboard-eyebrow">WEEKLY RULES</p><h2 className="mt-1 text-xl font-semibold text-white">Recurring windows</h2><p className="mt-2 text-sm text-slate-400">Overlapping active windows are rejected by the backend transaction.</p></div><CalendarClock className="text-emerald-300" size={22} /></div>
          <form onSubmit={submitRule} className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs text-slate-400">Weekday<select className={`${inputClass} mt-1`} value={ruleForm.weekday} onChange={event => setRuleForm(current => ({ ...current, weekday: Number(event.target.value) }))}>{weekdays.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label className="text-xs text-slate-400">Start<input type="time" className={`${inputClass} mt-1`} value={ruleForm.startTime} onChange={event => setRuleForm(current => ({ ...current, startTime: event.target.value }))} /></label>
            <label className="text-xs text-slate-400">End<input type="time" className={`${inputClass} mt-1`} value={ruleForm.endTime} onChange={event => setRuleForm(current => ({ ...current, endTime: event.target.value }))} /></label>
            <label className="text-xs text-slate-400">Mode<select className={`${inputClass} mt-1`} value={ruleForm.mode} onChange={event => setRuleForm(current => ({ ...current, mode: event.target.value as CoachSessionMode }))}>{modes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
            <label className="text-xs text-slate-400">Location<input className={`${inputClass} mt-1`} value={ruleForm.location} maxLength={255} onChange={event => setRuleForm(current => ({ ...current, location: event.target.value }))} placeholder="Optional" /></label>
            <button type="submit" disabled={saving} className="primary-button inline-flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-5"><Plus size={16} /> Add weekly window</button>
          </form>
          {loading ? <div className="panel-state mt-4"><Loader2 className="animate-spin" size={17} /> Loading rules...</div> : rules.length === 0 ? <div className="panel-state mt-4">No weekly windows configured.</div> : <div className="mt-4 space-y-2">{rules.map(rule => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3" key={rule.id}><div className="flex min-w-0 items-center gap-3"><Clock3 className="shrink-0 text-emerald-300" size={17} /><div><p className="font-medium text-white">{dayLabel(rule.weekday)} · {rule.start_time}–{rule.end_time}</p><p className="text-xs text-slate-400">{modeLabel(rule.mode)}{rule.location ? ` · ${rule.location}` : ''}</p></div></div><button type="button" className="text-slate-500 hover:text-red-300 disabled:opacity-50" disabled={saving} onClick={() => void removeRule(rule)} aria-label={`Delete ${dayLabel(rule.weekday)} rule`}><Trash2 size={16} /></button></div>)}</div>}
        </section>

        <section className="dashboard-panel">
          <div><p className="dashboard-eyebrow">DATE EXCEPTIONS</p><h2 className="mt-1 text-xl font-semibold text-white">Days off and special openings</h2><p className="mt-2 text-sm text-slate-400">BLOCK suppresses recurring rules. OPEN adds a validated window for one date.</p></div>
          <form onSubmit={submitException} className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-400">Date<input type="date" className={`${inputClass} mt-1`} value={exceptionForm.exceptionDate} onChange={event => setExceptionForm(current => ({ ...current, exceptionDate: event.target.value }))} /></label>
            <label className="text-xs text-slate-400">Type<select className={`${inputClass} mt-1`} value={exceptionForm.exceptionType} onChange={event => setExceptionForm(current => ({ ...current, exceptionType: event.target.value as 'BLOCK' | 'OPEN' }))}><option value="BLOCK">BLOCK · day off</option><option value="OPEN">OPEN · special window</option></select></label>
            {exceptionForm.exceptionType === 'OPEN' && <><label className="text-xs text-slate-400">Start<input type="time" className={`${inputClass} mt-1`} value={exceptionForm.startTime} onChange={event => setExceptionForm(current => ({ ...current, startTime: event.target.value }))} /></label><label className="text-xs text-slate-400">End<input type="time" className={`${inputClass} mt-1`} value={exceptionForm.endTime} onChange={event => setExceptionForm(current => ({ ...current, endTime: event.target.value }))} /></label><label className="text-xs text-slate-400">Mode<select className={`${inputClass} mt-1`} value={exceptionForm.mode} onChange={event => setExceptionForm(current => ({ ...current, mode: event.target.value as CoachSessionMode }))}>{modes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label><label className="text-xs text-slate-400">Location<input className={`${inputClass} mt-1`} value={exceptionForm.location} maxLength={255} onChange={event => setExceptionForm(current => ({ ...current, location: event.target.value }))} placeholder="Optional" /></label></>}
            <label className="text-xs text-slate-400 sm:col-span-2 lg:col-span-2">Note<textarea className={`${inputClass} mt-1 min-h-20`} value={exceptionForm.note} maxLength={1000} onChange={event => setExceptionForm(current => ({ ...current, note: event.target.value }))} placeholder="Optional Coach note" /></label>
            <button type="submit" disabled={saving} className="primary-button inline-flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-4"><Plus size={16} /> Add exception</button>
          </form>
          {exceptions.length === 0 ? <div className="panel-state mt-4">No date exceptions configured.</div> : <div className="mt-4 space-y-2">{exceptions.map(exception => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3" key={exception.id}><div><p className="font-medium text-white">{exception.exception_type} · {exception.exception_date}{exception.start_time ? ` · ${exception.start_time}–${exception.end_time}` : ''}</p><p className="text-xs text-slate-400">{exception.mode ? modeLabel(exception.mode) : 'Full-day block'}{exception.location ? ` · ${exception.location}` : ''}{exception.note ? ` · ${exception.note}` : ''}</p></div><button type="button" className="text-slate-500 hover:text-red-300 disabled:opacity-50" disabled={saving} onClick={() => void removeException(exception)} aria-label={`Delete ${exception.exception_type} exception`}><Trash2 size={16} /></button></div>)}</div>}
        </section>
      </div>

      <section className="dashboard-panel h-fit xl:sticky xl:top-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="dashboard-eyebrow">REAL SLOT PREVIEW</p><h2 className="mt-1 text-xl font-semibold text-white">Next 14 days</h2><p className="mt-2 text-sm text-slate-400">Preview uses the same database contract as public booking.</p></div><button type="button" className="text-slate-400 hover:text-white" onClick={() => void loadPreview(previewDate)} aria-label="Refresh availability preview"><RefreshCw size={17} className={previewLoading ? 'animate-spin' : ''} /></button></div>
        <label className="mt-5 block text-xs text-slate-400">Preview date<select className={`${inputClass} mt-1`} value={previewDate} onChange={event => setPreviewDate(event.target.value)}>{previewDates.map(option => <option key={option.value} value={option.value}>{option.label} · {option.value}</option>)}</select></label>
        {previewLoading && <div className="panel-state mt-5"><Loader2 className="animate-spin" size={17} /> Loading preview...</div>}
        {!previewLoading && availability && <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="text-xs text-slate-500">Status</span><strong className={`mt-1 block ${availability.booking_enabled ? 'text-emerald-300' : 'text-amber-300'}`}>{availability.booking_enabled ? 'Booking enabled' : 'Booking disabled'}</strong></div><div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><span className="text-xs text-slate-500">Timezone</span><strong className="mt-1 block text-white">{availability.timezone}</strong></div></div><div className="flex flex-wrap gap-3 text-xs text-slate-400"><span>{modeLabel(availability.mode)}</span>{availability.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{availability.location}</span>}<span>{availability.duration_minutes} min</span></div>{previewSlots.length === 0 ? <div className="panel-state">No bookable slots for this date.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{previewSlots.map(slot => <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3" key={`${slot.start_time}-${slot.mode}-${slot.location || ''}`}><strong className="block text-white">{slot.start_time}–{slot.end_time}</strong><span className="mt-1 block text-xs text-emerald-200">{modeLabel(slot.mode)}</span>{slot.location && <span className="mt-1 block truncate text-xs text-slate-400">{slot.location}</span>}</div>)}</div>}</div>}
      </section>
    </div>
  </CoachPage>;
}
