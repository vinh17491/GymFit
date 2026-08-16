import api from '../api/axios';
import type { AdminPage } from '../types/adminCoach';
import type { AdminWorkoutRecord } from '../types/adminWorkout';
const page = (response: { data: { data: AdminPage<AdminWorkoutRecord> } }) => response.data.data;
export const listAdminPrograms = async (params: Record<string, unknown>) => page(await api.get('/admin/workouts/programs', { params }));
export const listAdminAssignments = async (params: Record<string, unknown>) => page(await api.get('/admin/workouts/assignments', { params }));
export const listAdminSchedules = async (params: Record<string, unknown>) => page(await api.get('/admin/workouts/schedules', { params }));
export const listAdminSessions = async (params: Record<string, unknown>) => page(await api.get('/admin/workouts/sessions', { params }));
export const listAdminProgress = async (params: Record<string, unknown>) => page(await api.get('/admin/workouts/progress', { params }));
