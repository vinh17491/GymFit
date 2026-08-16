import api from '../api/axios';
import type { MemberCurrent, MemberExerciseProgressDetail, MemberProgress, MemberProgressSessionPage, MemberSchedule, MemberScheduleDetail, MemberSchedulePage, MemberSession, MemberSessionListItem, MemberSetLog } from '../types/memberWorkout';

const data = <T,>(response:{data:{data:T}}) => response.data.data;
export const getMemberCurrent = async (signal?: AbortSignal) => data<MemberCurrent>(await api.get('/member/workouts/current', { signal }));
export const listMemberSchedules = async (params:Record<string,unknown> = {}) => data<MemberSchedulePage>(await api.get('/member/workouts/schedules', { params }));
export const getMemberSchedule = async (id:number) => data<MemberScheduleDetail>(await api.get(`/member/workouts/schedules/${id}`));
export const startMemberSession = async (scheduleId:number) => data<MemberSession>(await api.post(`/member/workouts/schedules/${scheduleId}/start`));
export const listMemberSessions = async (params:Record<string,unknown> = {}) => data<{items:MemberSessionListItem[];pagination:{page:number;limit:number;total:number;totalPages:number}}>(await api.get('/member/workouts/sessions', { params }));
export const listMemberProgressSessions = async (params:Record<string,unknown> = {}) => data<MemberProgressSessionPage>(await api.get('/member/workouts/progress/sessions', { params }));
export const getMemberSession = async (id:number) => data<MemberSession>(await api.get(`/member/workouts/sessions/${id}`));
export const completeMemberSession = async (id:number) => data<MemberSession>(await api.post(`/member/workouts/sessions/${id}/complete`));
export const abandonMemberSession = async (id:number) => data<MemberSession>(await api.post(`/member/workouts/sessions/${id}/abandon`));
export const getMemberProgress = async (signal?: AbortSignal) => data<MemberProgress>(await api.get('/member/workouts/progress', { signal }));
export const getMemberExerciseProgress = async (exerciseId:number) => data<MemberExerciseProgressDetail>(await api.get(`/member/workouts/progress/exercises/${exerciseId}`));
export const createMemberSet = async (sessionId:number, sessionExerciseId:number, body:Record<string,unknown>) => data<MemberSetLog>(await api.post(`/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets`, body));
export const updateMemberSet = async (sessionId:number, sessionExerciseId:number, setId:number, body:Record<string,unknown>) => data<MemberSetLog>(await api.patch(`/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/${setId}`, body));
export const deleteMemberSet = async (sessionId:number, sessionExerciseId:number, setId:number) => api.delete(`/member/workouts/sessions/${sessionId}/exercises/${sessionExerciseId}/sets/${setId}`);
