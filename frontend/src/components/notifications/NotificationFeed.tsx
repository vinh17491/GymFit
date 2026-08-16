import { useEffect } from 'react';
import { ArrowUpRight, CheckCheck, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotificationsStore } from '../../stores/notificationsStore';
import type { AppNotification } from '../../services/notifications';

interface NotificationFeedProps {
  compact?: boolean;
  onNavigate?: () => void;
}

const safeActionUrl = (url: string | null): string | null => url && url.startsWith('/') && !url.startsWith('//') ? url : null;

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Vừa cập nhật' : date.toLocaleString('vi-VN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function NotificationRow({ item, onNavigate }: { item: AppNotification; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const markRead = useNotificationsStore(state => state.markRead);
  const actionUrl = safeActionUrl(item.action_url);
  const open = async () => {
    if (!item.is_read) await markRead(item.id);
    if (actionUrl) {
      onNavigate?.();
      navigate(actionUrl);
    }
  };
  return (
    <button type="button" onClick={() => void open()} className={`group w-full rounded-xl border p-3 text-left transition-colors ${item.is_read ? 'border-slate-800 bg-slate-950/30' : 'border-lime-300/25 bg-lime-300/[0.06]'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? 'bg-slate-700' : 'bg-lime-300 shadow-[0_0_0_4px_rgba(163,230,53,.1)]'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <strong className="text-sm text-slate-100">{item.title}</strong>
            {actionUrl && <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-slate-500 transition-colors group-hover:text-lime-300" aria-hidden="true" />}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">{item.message}</span>
          <span className="mt-2 block text-[11px] text-slate-600">{formatDate(item.created_at)}</span>
        </span>
      </div>
    </button>
  );
}

export default function NotificationFeed({ compact = false, onNavigate }: NotificationFeedProps) {
  const items = useNotificationsStore(state => state.items);
  const page = useNotificationsStore(state => state.page);
  const totalPages = useNotificationsStore(state => state.totalPages);
  const loading = useNotificationsStore(state => state.loading);
  const loadingMore = useNotificationsStore(state => state.loadingMore);
  const error = useNotificationsStore(state => state.error);
  const load = useNotificationsStore(state => state.load);
  const markAllRead = useNotificationsStore(state => state.markAllRead);
  const unreadCount = useNotificationsStore(state => state.unreadCount);

  useEffect(() => {
    if (!compact) void load(1, false);
  }, [compact, load]);

  if (loading) return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Đang tải thông báo…</div>;
  if (error && items.length === 0) return <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-rose-300">{error}</p><button type="button" className="btn-secondary btn-sm inline-flex items-center gap-2" onClick={() => void load(page, false)}><RefreshCw size={14} aria-hidden="true" />Thử lại</button></div>;
  if (items.length === 0) return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-slate-500"><Inbox size={24} aria-hidden="true" /><p className="text-sm">Chưa có thông báo.</p></div>;

  const visibleItems = compact ? items.slice(0, 5) : items;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}</p>
        {unreadCount > 0 && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-lime-300 hover:bg-lime-300/10" onClick={() => void markAllRead()}><CheckCheck size={14} aria-hidden="true" />Đọc tất cả</button>}
      </div>
      <div className="space-y-2">
        {visibleItems.map(item => <NotificationRow key={item.id} item={item} onNavigate={onNavigate} />)}
      </div>
      {!compact && totalPages > page && <button type="button" className="btn-secondary w-full" disabled={loadingMore} onClick={() => void load(page + 1, true)}>{loadingMore ? 'Đang tải…' : 'Tải thêm'}</button>}
      {compact && items.length > 5 && <Link to="/notifications" onClick={onNavigate} className="flex min-h-10 items-center justify-center rounded-lg border border-slate-800 text-xs font-semibold text-lime-300 hover:bg-slate-900">Xem tất cả thông báo</Link>}
    </div>
  );
}
