import api from '../api/axios';

export interface AppNotification {
  id: number;
  recipient_user_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: AppNotification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> { data: T }

export async function getNotifications(params?: { page?: number; limit?: number }, options?: { signal?: AbortSignal }): Promise<NotificationPage> {
  const response = await api.get<ApiResponse<NotificationPage>>('/notifications', { params, signal: options?.signal });
  return response.data.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<ApiResponse<{ unread: number }>>('/notifications/unread-count');
  return Number(response.data.data.unread ?? 0);
}

export async function markNotificationRead(id: number): Promise<AppNotification> {
  const response = await api.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`);
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const response = await api.post<ApiResponse<{ updated: number }>>('/notifications/read-all');
  return response.data.data;
}
