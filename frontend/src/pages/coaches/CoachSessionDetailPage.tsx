import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSession } from '../../services/coachWorkspaceApi';
import type { CoachSessionDetail } from '../../types/coachWorkspace';
import { CoachPage, ErrorState, LoadingState } from './CoachCommon';

export default function CoachSessionDetailPage() {
  const { memberId, source, sessionId } = useParams();
  const [item, setItem] = useState<CoachSessionDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (memberId && sessionId) getSession(Number(memberId), source === 'legacy' || source === 'member' ? source : undefined, Number(sessionId)).then(setItem).catch(() => setError('Session không tồn tại trong active scope hoặc cần source rõ ràng.'));
  }, [memberId, sessionId, source]);

  return <CoachPage title="Session detail" description="Read-only snapshot và set summary từ execution Member." backTo={`/coach/members/${memberId}/sessions`}>
    {!item && !error ? <LoadingState /> : error ? <ErrorState message={error} /> : item && <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]"><div className="dashboard-panel"><h2 className="text-xl font-semibold text-white">{item.workout_name}</h2><p className="mt-3 text-sm text-slate-400">{item.status} · {new Date(item.started_at).toLocaleString('vi-VN')}</p><p className="mt-6 text-sm text-emerald-200">Set summary: {item.setSummary ? `${item.setSummary.completed}/${item.setSummary.total} completed` : 'Legacy session — no Member set logs'}</p></div><div className="dashboard-panel"><h2 className="text-lg font-semibold text-white">Exercise snapshot</h2>{item.exerciseSnapshot.length === 0 ? <div className="panel-state mt-4">Chưa có snapshot.</div> : <div className="mt-4 space-y-2">{item.exerciseSnapshot.map((exercise, index) => { const row=exercise as { name?:unknown; exercise_name?:unknown; sets?:unknown; reps?:unknown; duration_seconds?:unknown; target_sets?:unknown; target_reps_min?:unknown; target_reps_max?:unknown; target_duration_seconds?:unknown; }; const logged=Array.isArray(row.sets)?row.sets.filter(value=>Boolean((value as { completed?:unknown }).completed)).length:null; return <div className="rounded-xl border border-slate-800 p-3" key={index}><p className="text-sm text-white">{String(row.exercise_name ?? row.name ?? 'Exercise')}</p><p className="text-xs text-slate-500">Target sets {String(row.target_sets ?? row.sets ?? '—')} · Target reps {String(row.target_reps_min ?? row.reps ?? '—')} · Duration {String(row.target_duration_seconds ?? row.duration_seconds ?? '—')}</p>{logged!==null&&<p className="mt-2 text-xs text-emerald-300">Completed sets: {logged}</p>}</div>; })}</div>}</div></div>}
  </CoachPage>;
}
