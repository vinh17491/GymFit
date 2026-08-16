import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle, ChevronRight, Clock, Loader2, MapPin } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCoachAvailability, getPublicCoach, type Coach, type CoachAvailability, type CoachAvailabilitySlot, type CoachSessionMode } from '../../services/coaches';
import { createBooking, getCoachBookingQuota, type CoachBookingQuota } from '../../services/bookings';
import { roleHome } from '../../auth/accessPolicy';
import { useAuthStore } from '../../stores/authStore';
import { coachDateOptions } from '../../utils/coachBooking';

const modeLabel = (mode: CoachSessionMode | null): string => mode === 'ONLINE' ? 'Online' : mode === 'IN_PERSON' ? 'In person' : mode === 'BOTH' ? 'Online + in person' : 'Coach mode';

const reasonMessage = (reason: unknown): { status?: number; message: string } => {
  const value = reason as { response?: { status?: number; data?: { message?: string } }; message?: string };
  return { status: value.response?.status, message: value.response?.data?.message || value.message || 'Unable to load availability.' };
};

function realSlots(value: CoachAvailability | null, coach: Coach | null): CoachAvailabilitySlot[] {
  if (!value) return [];
  const current = (value.slots || []).filter(slot => !slot.booked && !slot.past);
  if (current.length > 0) return current;
  if (!coach) return [];
  const concreteMode = coach.sessionMode;
  if (concreteMode !== 'ONLINE' && concreteMode !== 'IN_PERSON') return [];
  return (value.available_slots || []).map(startTime => ({
    start_time: startTime,
    end_time: `${String(Number(startTime.slice(0, 2)) + 1).padStart(2, '0')}:${startTime.slice(3, 5)}`,
    mode: concreteMode,
    location: concreteMode === 'ONLINE' ? null : coach.location || null,
    source: 'WEEKLY_RULE' as const,
    booked: false,
    past: false,
  }));
}

const slotKeyFor = (value: CoachAvailabilitySlot): string => `${value.start_time}-${value.end_time}-${value.mode}-${value.location || ''}`;

export default function CoachBooking() {
  const { id } = useParams<{ id: string }>();
  const { user, initialized } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [availability, setAvailability] = useState<CoachAvailability | null>(null);
  const [quota, setQuota] = useState<CoachBookingQuota | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dates = useMemo(() => coachDateOptions(), []);
  const slots = useMemo(() => realSlots(availability, coach), [availability, coach]);
  const selectedSlot = slots.find(value => slotKeyFor(value) === slot) || null;

  useEffect(() => {
    if (!id || !user || user.role !== 'member') return;
    getPublicCoach(id).then(setCoach).catch(reason => setError(reasonMessage(reason).message)).finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (!id || !date || !coach?.bookingEnabled) return;
    const controller = new AbortController();
    setSlotsLoading(true);
    setError('');
    setSlot('');
    getCoachAvailability(id, date, controller.signal).then(setAvailability).catch(reason => {
      const value = reasonMessage(reason);
      if ((reason as { code?: string }).code !== 'ERR_CANCELED') {
        setError(value.message);
        setAvailability(null);
      }
    }).finally(() => { if (!controller.signal.aborted) setSlotsLoading(false); });
    return () => controller.abort();
  }, [id, date, coach?.bookingEnabled]);

  useEffect(() => {
    if (!user || user.role !== 'member') return;
    let active = true;
    const quotaDate = date || dates[0]?.value;
    if (!quotaDate) return;
    getCoachBookingQuota(quotaDate)
      .then(value => { if (active) setQuota(value); })
      .catch(() => { if (active) setQuota(null); });
    return () => { active = false; };
  }, [date, dates, user]);

  if (!initialized) return <div className="flex min-h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-[#2563eb]" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'member') return <Navigate to={roleHome(user.role)} replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#020617] text-[#94a3b8]"><Loader2 className="mr-3 animate-spin text-[#2563eb]" />Loading...</div>;
  if (!coach || !id) return <div className="p-10 text-center text-red-300">{error || 'Coach not found.'}</div>;

  const reloadAfterConflict = async () => {
    if (!id || !date) return;
    try { setAvailability(await getCoachAvailability(id, date)); setSlot(''); setStep(2); }
    catch (reason: unknown) { setError(reasonMessage(reason).message); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date || !slot || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (!selectedSlot) return;
      await createBooking({ coachId: coach.id, date, startTime: selectedSlot.start_time, sessionMode: selectedSlot.mode, note: note.trim() || undefined });
      navigate('/appointments', { replace: true });
    } catch (reason: unknown) {
      const value = reasonMessage(reason);
      setError(value.status === 409 ? 'This slot was just taken. Availability has been refreshed; please choose another slot.' : value.message);
      if (value.status === 409) await reloadAfterConflict();
    } finally { setSubmitting(false); }
  };

  return <div className="min-h-screen bg-[#020617] py-16"><div className="mx-auto max-w-3xl px-4 sm:px-6"><Link to={`/coaches/${coach.id}`} className="mb-6 inline-flex items-center gap-2 text-[#94a3b8]"><ArrowLeft size={16} /> Back to Coach</Link><div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 sm:p-8"><h1 className="text-3xl font-bold text-white">Book with {coach.name}</h1><p className="mt-2 text-[#94a3b8]">Choose a real availability window in {availability?.timezone || 'Asia/Ho_Chi_Minh'}.</p><div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-[#94a3b8]">{['Date', 'Slot', 'Confirm'].map((label, index) => <span key={label} className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${step >= index + 1 ? 'bg-[#2563eb] text-white' : 'bg-[#1e293b] text-slate-500'}`}>{index + 1}</span>{label}{index < 2 && <ChevronRight size={15} />}</span>)}</div>{error && <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {!coach.bookingEnabled && <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">This Coach is not accepting new bookings right now.</div>}
      {quota && !quota.included && <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">Coach booking is not included in your active Membership. <Link className="font-semibold underline" to="/membership">Review plans</Link>.</div>}
      {quota?.included && <p className="mt-6 text-sm text-[#94a3b8]">Coach booking quota for {quota.bookingMonth}: {quota.monthlyLimit === null ? `${quota.used} used · Unlimited` : `${quota.used}/${quota.monthlyLimit} used · ${quota.remaining} remaining`}.</p>}
      <form onSubmit={submit} className="mt-8 space-y-7">
        {step === 1 && <div><label htmlFor="booking-date" className="block text-sm font-medium text-white">Appointment date</label><select id="booking-date" disabled={!coach.bookingEnabled} value={date} onChange={event => { setDate(event.target.value); setStep(2); }} className="mt-2 w-full rounded-lg border border-[#334155] bg-[#020617] px-3 py-3 text-white"><option value="">Choose a date</option>{dates.map(option => <option key={option.value} value={option.value}>{option.label} · {option.value}</option>)}</select></div>}
        {step >= 2 && <div><div className="flex items-center justify-between"><label className="block text-sm font-medium text-white">Available slots</label><button type="button" onClick={() => setStep(1)} className="text-xs text-[#60a5fa]">Change date</button></div>{slotsLoading ? <div className="mt-3 flex items-center gap-2 text-sm text-[#94a3b8]"><Loader2 size={15} className="animate-spin" />Loading real slots...</div> : slots.length === 0 ? <p className="mt-3 text-sm text-[#94a3b8]">No bookable slot is configured for this date.</p> : <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{slots.map(value => <button type="button" key={slotKeyFor(value)} onClick={() => { setSlot(slotKeyFor(value)); setStep(3); }} className={`rounded-lg border p-3 text-left text-sm ${slot === slotKeyFor(value) ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#334155] bg-[#020617] text-[#cbd5e1] hover:border-[#2563eb]'}`}><strong className="block"><Clock size={14} className="mr-1 inline" />{value.start_time}–{value.end_time}</strong><span className="mt-1 block text-xs opacity-80">{modeLabel(value.mode)}{value.location ? ` · ${value.location}` : ''}</span></button>)}</div>}</div>}
        {step === 3 && selectedSlot && <div className="space-y-5"><div className="rounded-xl border border-[#334155] bg-[#020617] p-4 text-sm text-[#cbd5e1]"><p><Calendar size={15} className="mr-2 inline text-[#60a5fa]" />{date}</p><p className="mt-2"><Clock size={15} className="mr-2 inline text-[#60a5fa]" />{selectedSlot.start_time}–{selectedSlot.end_time} · {availability?.duration_minutes || 60} min</p><p className="mt-2">Mode: {modeLabel(selectedSlot.mode)}</p>{selectedSlot.location && <p className="mt-2"><MapPin size={15} className="mr-2 inline text-[#60a5fa]" />{selectedSlot.location}</p>}</div><label htmlFor="booking-note" className="block text-sm font-medium text-white">Note (optional)<textarea id="booking-note" value={note} maxLength={500} onChange={event => setNote(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-[#334155] bg-[#020617] px-3 py-3 text-white" placeholder="Goal or note for the Coach" /></label><button type="submit" disabled={!date || !slot || submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 py-3 font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} />} Submit booking request</button><p className="text-center text-xs text-[#64748b]">The appointment starts as PENDING until the Coach confirms it.</p></div>}
      </form></div></div></div>;
}
