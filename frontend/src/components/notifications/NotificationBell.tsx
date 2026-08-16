import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationsStore } from '../../stores/notificationsStore';
import NotificationFeed from './NotificationFeed';

export default function NotificationBell() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const unreadCount = useNotificationsStore(state => state.unreadCount);
  const load = useNotificationsStore(state => state.load);
  const refreshUnread = useNotificationsStore(state => state.refreshUnread);
  const reset = useNotificationsStore(state => state.reset);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { reset(); return undefined; }
    void refreshUnread();
    const timer = window.setInterval(() => { void refreshUnread(); }, 60000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refreshUnread, reset]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('mousedown', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  }, [open]);

  if (!isAuthenticated) return null;
  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" className="icon-button relative" aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { const next = !open; setOpen(next); if (next) void load(1, false); }}>
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[9px] font-bold text-slate-950">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/40" role="dialog" aria-label="Thông báo">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Thông báo</p><p className="mt-1 text-[11px] text-slate-500">Cập nhật từ Coach workspace và tài khoản của bạn</p></div><Link to="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-lime-300 hover:text-lime-200">Mở trang đầy đủ</Link></div>
        <NotificationFeed compact onNavigate={() => setOpen(false)} />
      </div>}
    </div>
  );
}
