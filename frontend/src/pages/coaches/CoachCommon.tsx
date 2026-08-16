import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export function CoachPage({ title, description, backTo, actions, children }: { title:string; description:string; backTo?:string; actions?:ReactNode; children:ReactNode }) {
  return <div className="dashboard-page"><div className="dashboard-header"><div>{backTo && <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3"><ArrowLeft size={15}/> Quay lại</Link>}<p className="dashboard-eyebrow">COACH WORKSPACE</p><h1>{title}</h1><p className="dashboard-description">{description}</p></div>{actions && <div className="dashboard-header-action">{actions}</div>}</div>{children}</div>;
}
export function LoadingState() { return <div className="panel-state"><Loader2 className="animate-spin" size={18}/> Đang tải…</div>; }
export function ErrorState({ message, retry }: { message:string; retry?:()=>void }) { return <div className="panel-state panel-error"><AlertCircle size={18}/><span>{message}</span>{retry && <button className="secondary-button" onClick={retry}>Thử lại</button>}</div>; }
export function ConfirmDialog({ title, description, onCancel, onConfirm }: { title:string; description:string; onCancel:()=>void; onConfirm:()=>void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><button aria-label="Đóng hộp thoại" className="absolute inset-0 bg-black/70" onClick={onCancel}/><div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{description}</p><div className="mt-6 flex justify-end gap-3"><button className="secondary-button" onClick={onCancel}>Hủy</button><button className="primary-button" onClick={onConfirm}>Xác nhận</button></div></div></div>; }
export const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400';
export const buttonClass = 'rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-white disabled:opacity-40';
