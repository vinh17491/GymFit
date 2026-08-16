import api from '../api/axios';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type BookingSessionMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export const bookingSessionModeLabel: Record<BookingSessionMode, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Tại phòng tập',
  BOTH: 'Online / tại phòng tập',
};

export interface Booking {
  id: number;
  coach_id: number;
  member_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  session_mode: BookingSessionMode | null;
  location: string | null;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string | null;
  coach_name?: string | null;
  coach_avatar_url?: string | null;
}

export interface CreateBookingPayload {
  coachId: number;
  date: string;
  startTime: string;
  sessionMode?: Exclude<BookingSessionMode, 'BOTH'>;
  note?: string;
}

interface ApiResponse<T> { data: T }
interface BookingListResponse { data: Booking[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }
export interface BookingQuery { status?: BookingStatus | BookingStatus[]; fromDate?: string; toDate?: string; page?: number; limit?: number }
export interface RequestOptions { signal?: AbortSignal }
export interface BookingPage { items: Booking[]; page: number; limit: number; total: number; totalPages: number }
export interface BookingSummary { total: number; pending: number; confirmed: number; completed: number; cancelled: number; no_show: number; upcoming: number; today: number; asOfDate: string; timezone: string }
export interface CoachBookingQuota { included: boolean; monthlyLimit: number | null; used: number; remaining: number | null; bookingMonth: string; timezone: string; reason?: 'COACH_BOOKING_NOT_INCLUDED' }

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const response = await api.post<ApiResponse<Booking>>('/bookings', payload);
  return response.data.data;
}

function queryParams(params?: BookingQuery): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return { ...params, status: Array.isArray(params.status) ? params.status.join(',') : params.status };
}

export async function getBookingsPage(params?: BookingQuery, options?: RequestOptions): Promise<BookingPage> {
  const response = await api.get<BookingListResponse>('/bookings', { params: queryParams(params), ...(options?.signal ? { signal: options.signal } : {}) });
  const pagination = response.data.pagination ?? { page: params?.page ?? 1, limit: params?.limit ?? response.data.data.length, total: response.data.data.length, totalPages: response.data.data.length ? 1 : 0 };
  return { items: response.data.data, ...pagination };
}

export async function getMyBookings(params?: BookingQuery, options?: RequestOptions): Promise<Booking[]> {
  return (await getBookingsPage(params, options)).items;
}

export async function getBookingSummary(params?: Pick<BookingQuery, 'fromDate' | 'toDate'>, options?: RequestOptions): Promise<BookingSummary> {
  const response = await api.get<ApiResponse<BookingSummary>>('/bookings/summary', { params, ...(options?.signal ? { signal: options.signal } : {}) });
  return response.data.data;
}

export async function getBookingById(id: number | string): Promise<Booking> {
  const response = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
  return response.data.data;
}

export async function updateBookingStatus(id: number | string, status: Exclude<BookingStatus, 'pending'>): Promise<Booking> {
  const response = await api.put<ApiResponse<Booking>>(`/bookings/${id}/status`, { status });
  return response.data.data;
}

export async function cancelMyBooking(id: number | string): Promise<Booking> {
  return updateBookingStatus(id, 'cancelled');
}

export async function getCoachAppointmentsPage(params?: BookingQuery, options?: RequestOptions): Promise<BookingPage> {
  return getBookingsPage(params, options);
}

export async function getCoachBookingQuota(date?: string): Promise<CoachBookingQuota> {
  const response = await api.get<ApiResponse<CoachBookingQuota>>('/bookings/quota', { params: date ? { date } : undefined });
  return response.data.data;
}

export async function getCoachAppointments(params?: BookingQuery, options?: RequestOptions): Promise<Booking[]> {
  return (await getCoachAppointmentsPage(params, options)).items;
}

export async function confirmBooking(id: number | string): Promise<Booking> {
  return updateBookingStatus(id, 'confirmed');
}

export async function cancelCoachBooking(id: number | string): Promise<Booking> {
  return updateBookingStatus(id, 'cancelled');
}

export async function completeBooking(id: number | string): Promise<Booking> {
  return updateBookingStatus(id, 'completed');
}

export async function markBookingNoShow(id: number | string): Promise<Booking> {
  return updateBookingStatus(id, 'no_show');
}
