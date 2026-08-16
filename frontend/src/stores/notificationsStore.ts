import { create } from 'zustand';
import {
  AppNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationPage,
} from '../services/notifications';

interface NotificationsState {
  items: AppNotification[];
  page: number;
  total: number;
  totalPages: number;
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  load: (page?: number, append?: boolean) => Promise<void>;
  refreshUnread: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

let requestSequence = 0;
const initialState = { items: [], page: 1, total: 0, totalPages: 0, unreadCount: 0, loading: false, loadingMore: false, error: null as string | null };

const messageFrom = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }
  return fallback;
};

const mergeItems = (previous: AppNotification[], next: AppNotification[]): AppNotification[] => {
  const byId = new Map(previous.map(item => [item.id, item]));
  next.forEach(item => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => {
    const dateDiff = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    return dateDiff || right.id - left.id;
  });
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  ...initialState,
  load: async (page = 1, append = false) => {
    const sequence = ++requestSequence;
    set({ loading: !append, loadingMore: append, error: null });
    try {
      const result: NotificationPage = await getNotifications({ page, limit: 20 });
      if (sequence !== requestSequence) return;
      set(state => ({
        items: append ? mergeItems(state.items, result.items) : result.items,
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        loading: false,
        loadingMore: false,
        error: null,
      }));
      await get().refreshUnread();
    } catch (error) {
      if (sequence !== requestSequence) return;
      set({ loading: false, loadingMore: false, error: messageFrom(error, 'Không thể tải thông báo.') });
    }
  },
  refreshUnread: async () => {
    try {
      const unreadCount = await getUnreadNotificationCount();
      set({ unreadCount });
    } catch (error) {
      set({ error: messageFrom(error, 'Không thể cập nhật số thông báo chưa đọc.') });
    }
  },
  markRead: async (id: number) => {
    try {
      await markNotificationRead(id);
      set(state => ({
        items: state.items.map(item => item.id === id ? { ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() } : item),
        unreadCount: Math.max(0, state.unreadCount - (state.items.find(item => item.id === id && !item.is_read) ? 1 : 0)),
        error: null,
      }));
    } catch (error) {
      set({ error: messageFrom(error, 'Không thể đánh dấu thông báo đã đọc.') });
    }
  },
  markAllRead: async () => {
    try {
      await markAllNotificationsRead();
      set(state => ({ items: state.items.map(item => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })), unreadCount: 0, error: null }));
    } catch (error) {
      set({ error: messageFrom(error, 'Không thể đánh dấu toàn bộ thông báo.') });
    }
  },
  reset: () => { requestSequence += 1; set(initialState); },
}));
