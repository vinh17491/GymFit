import api from '../api/axios';

export type CoachSessionMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type CoachAvailabilityExceptionType = 'BLOCK' | 'OPEN';

export interface CoachAvailabilityRule {
  id: number;
  coach_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  mode: CoachSessionMode;
  location: string | null;
  is_active: boolean;
}

export interface CoachAvailabilityException {
  id: number;
  coach_id: number;
  exception_date: string;
  exception_type: CoachAvailabilityExceptionType;
  start_time: string | null;
  end_time: string | null;
  mode: CoachSessionMode | null;
  location: string | null;
  note: string | null;
  is_active: boolean;
}

export interface CoachAvailabilitySlot {
  start_time: string;
  end_time: string;
  mode: Exclude<CoachSessionMode, 'BOTH'>;
  location: string | null;
  source: 'WEEKLY_RULE' | 'OPEN_EXCEPTION';
  booked: boolean;
  past: boolean;
}

export interface CoachSelfProfile {
  coachId: number;
  name: string;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: CoachSessionMode | null;
  location: string | null;
  bookingEnabled: boolean;
}

export interface Coach {
  id: number;
  name: string;
  avatarUrl: string | null;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: CoachSessionMode | null;
  location: string | null;
  bookingEnabled: boolean;
}

export type CoachDetail = Coach;

export interface CoachAvailability {
  active: boolean;
  booking_enabled: boolean;
  bookingEnabled?: boolean;
  date: string;
  coach_id: number;
  available_slots: string[];
  booked_slots: string[];
  duration_minutes: number;
  timezone: string;
  mode: CoachSessionMode | null;
  location: string | null;
  session_mode?: CoachSessionMode | null;
  profile_location?: string | null;
  rules: CoachAvailabilityRule[];
  exceptions: CoachAvailabilityException[];
  slots: CoachAvailabilitySlot[];
}

interface ApiResponse<T> { data: T }
export interface CoachPagination { page: number; limit: number; total: number; totalPages: number }
export interface CoachListResult { items: Coach[]; coaches: Coach[]; pagination: CoachPagination }

export async function listPublicCoaches(params?: { search?: string; page?: number; limit?: number }, options?: { signal?: AbortSignal }): Promise<CoachListResult> {
  const response = await api.get<ApiResponse<CoachListResult>>('/coaches', { params, signal: options?.signal });
  return response.data.data;
}

export async function getPublicCoach(coachId: number | string, options?: { signal?: AbortSignal }): Promise<Coach> {
  const response = await api.get<ApiResponse<Coach>>(`/coaches/${coachId}`, { signal: options?.signal });
  return response.data.data;
}

export async function getCoachAvailability(coachId: number | string, date: string, signal?: AbortSignal): Promise<CoachAvailability> {
  const response = await api.get<ApiResponse<CoachAvailability>>(`/coaches/${coachId}/availability`, { params: { date }, signal });
  return response.data.data;
}

export interface CoachAvailabilityRuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
  mode: CoachSessionMode;
  location?: string | null;
  isActive?: boolean;
}

export interface CoachAvailabilityExceptionInput {
  exceptionDate: string;
  exceptionType: CoachAvailabilityExceptionType;
  startTime?: string | null;
  endTime?: string | null;
  mode?: CoachSessionMode | null;
  location?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export async function getMyCoachAvailability(date: string, signal?: AbortSignal): Promise<CoachAvailability> {
  const response = await api.get<ApiResponse<CoachAvailability>>('/coach/availability', { params: { date }, signal, headers: { 'Cache-Control': 'no-cache' } });
  return response.data.data;
}

export async function listMyAvailabilityRules(includeInactive = false): Promise<CoachAvailabilityRule[]> {
  const response = await api.get<ApiResponse<CoachAvailabilityRule[]>>('/coach/availability/rules', { params: { includeInactive }, headers: { 'Cache-Control': 'no-cache' } });
  return Array.isArray(response.data.data) ? response.data.data : [];
}

export async function createMyAvailabilityRule(input: CoachAvailabilityRuleInput): Promise<CoachAvailabilityRule> {
  const response = await api.post<ApiResponse<CoachAvailabilityRule>>('/coach/availability/rules', input);
  return response.data.data;
}

export async function updateMyAvailabilityRule(id: number, input: Partial<CoachAvailabilityRuleInput>): Promise<CoachAvailabilityRule> {
  const response = await api.patch<ApiResponse<CoachAvailabilityRule>>(`/coach/availability/rules/${id}`, input);
  return response.data.data;
}

export async function deleteMyAvailabilityRule(id: number): Promise<void> {
  await api.delete(`/coach/availability/rules/${id}`);
}

export async function listMyAvailabilityExceptions(includeInactive = false): Promise<CoachAvailabilityException[]> {
  const response = await api.get<ApiResponse<CoachAvailabilityException[]>>('/coach/availability/exceptions', { params: { includeInactive }, headers: { 'Cache-Control': 'no-cache' } });
  return Array.isArray(response.data.data) ? response.data.data : [];
}

export async function createMyAvailabilityException(input: CoachAvailabilityExceptionInput): Promise<CoachAvailabilityException> {
  const response = await api.post<ApiResponse<CoachAvailabilityException>>('/coach/availability/exceptions', input);
  return response.data.data;
}

export async function updateMyAvailabilityException(id: number, input: Partial<CoachAvailabilityExceptionInput>): Promise<CoachAvailabilityException> {
  const response = await api.patch<ApiResponse<CoachAvailabilityException>>(`/coach/availability/exceptions/${id}`, input);
  return response.data.data;
}

export async function deleteMyAvailabilityException(id: number): Promise<void> {
  await api.delete(`/coach/availability/exceptions/${id}`);
}

export async function getMyCoachProfile(): Promise<CoachSelfProfile> {
  const response = await api.get<ApiResponse<CoachSelfProfile>>('/coach/profile');
  return response.data.data;
}

export async function updateMyCoachProfile(input: {
  specialty: string;
  bio: string;
  experienceYears: number | null;
  sessionMode: CoachSessionMode | null;
  location: string;
  bookingEnabled: boolean;
}): Promise<CoachSelfProfile> {
  const response = await api.patch<ApiResponse<CoachSelfProfile>>('/coach/profile', input);
  return response.data.data;
}

// Compatibility aliases for existing Coach pages; all calls use the canonical /api/coaches source.
export const getCoaches = listPublicCoaches;
export const getCoachById = async (id: string): Promise<CoachDetail> => getPublicCoach(id);
