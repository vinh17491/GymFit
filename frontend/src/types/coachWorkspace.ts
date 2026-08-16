export interface CoachAttentionItem { type: 'PENDING_BOOKING' | 'SKIPPED_SCHEDULES' | 'NO_WORKOUT_7D' | 'ASSIGNMENT_EXPIRING' | 'MISSING_FUTURE_SCHEDULE' | 'EMPTY_PROGRAM_DAY' | 'LOW_COMPLETION'; severity: 'HIGH' | 'MEDIUM' | 'LOW'; memberId: number; memberName: string; title: string; description: string; actionUrl: string; createdFrom: string; }
export interface CoachDashboardData {
  counts: { assignedMembers: number; activeMembers: number; ownedPrograms: number; activeAssignments: number };
  upcomingSchedules: CoachSchedule[];
  recentSessions: CoachSession[];
  attentionQueue: CoachAttentionItem[];
  attentionQueueAvailable: boolean;
}
export interface CoachExercise { id:number; name:string; slug:string; description:string|null; instructions:string|null; muscle_group:string|null; equipment:string|null; difficulty:string|null; thumbnail_url:string|null; is_active:boolean; created_at:string; updated_at:string; }
export type CoachProgramLifecycle = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface CoachProgram { id:number; name:string; description:string|null; goal:string; difficulty:string; duration_weeks:number; days_per_week:number; owner_coach_id:number; is_active:boolean; root_program_id?:number; version_number?:number; lifecycle_status?:CoachProgramLifecycle; published_at?:string|null; cloned_from_program_id?:number|null; created_at:string; updated_at:string; day_count?:number; exercise_count?:number; days?:CoachProgramDay[]; }
export interface CoachProgramDay { id:number; program_id:number; week_number:number; day_number:number; title:string; description:string|null; sort_order:number; exercises:CoachProgramExercise[]; }
export interface CoachProgramExercise { id:number; program_day_id:number; exercise_id:number; sort_order:number; target_sets:number|null; target_reps_min:number|null; target_reps_max:number|null; target_weight:number|null; target_duration_seconds:number|null; rest_seconds:number|null; tempo:string|null; coach_note:string|null; exercise_name:string; exercise_slug:string; muscle_group:string|null; equipment:string|null; difficulty:string|null; thumbnail_url:string|null; }
export interface CoachMember { id:number; name:string; email:string; phone:string|null; avatar_url:string|null; last_contact_at:string|null; assigned_at:string; }
export interface CoachMemberDetail extends CoachMember { currentAssignment:CoachAssignment|null; sessionCount:number; sessionDataAvailable:boolean; }
export interface CoachMemberContext { id:number; coach_id:number; member_id:number; goal:string|null; limitations:string|null; private_note:string|null; next_review_date:string|null; created_at:string; updated_at:string; }
export interface CoachMemberContextResponse { context:CoachMemberContext|null; readOnly:boolean; currentCoachId:number|null; }
export interface CoachAssignment { id:number; member_id:number; program_id:number; coach_id:number; assigned_by:number; start_date:string; end_date:string|null; status:string; schedule_timezone:string; note:string|null; program_name?:string; member_name?:string; assignment_status?:string; }
export interface CoachSchedule { id:number; assignment_id:number; program_day_id:number; scheduled_date:string; status:string; member_id:number; program_id:number; program_name:string; member_name:string; day_title:string; week_number:number; day_number:number; schedule_timezone?:string; }
export interface CoachSession { id:number; member_id:number; member_name:string; started_at:string; completed_at:string|null; status:string; workout_name:string; source:'legacy'|'member'; }
export interface CoachSessionHistoryItem { id:number; member_id:number; workout_id:number|null; assignment_id?:number; schedule_id?:number; started_at:string; completed_at:string|null; status:string; notes:string|null; workout_name:string; workout_description:string|null; setSummary:{total:number;completed:number}|null; blockedReason:string|null; source:'legacy'|'member'; }
export interface CoachSessionDetail extends CoachSessionHistoryItem { exerciseSnapshot:unknown[]; }
export interface CoachProgressSession { id:number; started_at:string; completed_at?:string|null; ended_at?:string|null; status:string; workout_name?:string; program_name?:string; day_title?:string; total_duration_seconds?:number|null; scheduled_date?:string; source:'legacy'|'member'; }
export interface CoachExerciseProgress { exercise_id:number; exercise_name:string; session_count:number; completed_sets:number; total_reps:number; training_volume:number; }
export interface CoachProgress { completed_sessions:number; total_duration:number; training_volume:number|null; completion_rate:number|null; recent_sessions:CoachProgressSession[]; exercise_history:CoachExerciseProgress[]; due_schedules?:number; completed_due_schedules?:number; blockedReason:string|null; dataSources:{legacySessions:boolean;setLogs:boolean;memberProgressFlow:boolean}; }
