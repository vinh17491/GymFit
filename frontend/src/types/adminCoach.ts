export type AdminCoachStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export interface AdminPage<T> { items: T[]; page: number; limit: number; total: number; totalPages: number; }
export interface AdminCoach {
  id: number; name: string; email: string; phone: string | null; avatar_url: string | null; is_active: boolean;
  status: AdminCoachStatus; status_reason: string | null; status_updated_at: string | null; created_at: string; updated_at: string;
  member_count: number; program_count: number; recent_session_count: number; specialization?: string | null; experience?: string | null;
}
export interface AdminCoachSummary { totalCoaches: number; activeCoaches: number; suspendedCoaches: number; unassignedMembers: number; expiringAssignments: number; completedSessionsThisWeek: number; }
export interface AdminCoachMember { id: number; name: string; email: string; phone: string | null; avatar_url: string | null; assigned_at: string; assigned_coach_id?: number | null; active_assignment_id?: number | null; assignment_status?: string | null; program_name?: string | null; }
export interface AdminReassignInput { newCoachId: number; programId: number; startDate: string; endDate?: string | null; scheduleTimezone: string; note?: string | null; }
