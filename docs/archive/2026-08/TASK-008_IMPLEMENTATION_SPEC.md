# Status: HISTORICAL
# DO NOT USE AS CURRENT SOURCE OF TRUTH.
# Superseded by: `docs/coach/COACH_END_TO_END_HANDOVER.md` and `docs/ROADMAP.md`

# GymFit — TASK-008 Implementation Specification

## Workout Program, Member Sessions and Progress

Baseline
Workspace: D:\Web-GYM-main (use repository-relative paths in committed docs)
Canonical DB: GYMFIT_DB
Base branch: 007c-order-management
Base commit: 427ad52996961648ffc622ca1bf2999a5aab3df4
Proposed branch: 008-workout-programs-progress
Migrations 0001-0005: APPLIED
TASK-007: COMPLETE
TASK-008 was previously CANCELLED / OUT OF SCOPE. After FULL TASK-007 runtime
acceptance, it is reopened with the limited scope WORKOUT PROGRAM AND MEMBER
PROGRESS. This supersedes older roadmaps. AI, camera and pose estimation remain
excluded.

1. EXECUTION MODEL
Run one-shot by subtask gates. Fix and continue without requesting new prompts.
Discovery precedes 0006. Build Gate A follows 008A, B follows 008B, C follows
008C, then one final build before explicit commit/push. Avoid repeated full builds
after individual files. Do not implement beyond locked scope or rebuild TASK-007.

2. DISCOVERY GATE
Audit actual DB tables; exercise/workout/program/session/progress modules/routes/
services; WorkoutPrograms.tsx; MediaPlayer.tsx; media handling; User/Role schema;
and Coach-Member relationships. Classify each as REUSE, EXTEND, REPLACE or
DEPRECATED with evidence. Do not create a parallel system. Resolve ownership,
table compatibility, media, timezone, constraints and backfill before 0006.

3. LOCKED SCOPE
008A: Exercise Library, Workout Programs, Program Days, Program Exercises, and
Admin/Coach management UI.
008B: Coach-Member relation if missing, Member Assignments/Schedules, Workout
Sessions, Session Exercise snapshots, Set Logs, and Member workout UI.
008C: progress summary, session statistics, exercise history, weekly/monthly
progress, optional body measurements, role-scoped progress UI, final acceptance.
Out of scope: AI recommendation, camera, pose estimation, automatic rep counting,
medical diagnosis, nutrition/meal tracking, wearables, live video coaching, new
payment work, and social/gamification expansion.

4. ROLE POLICY
ADMIN: full Exercise/Program and Assignment management; operational progress view.
COACH: read active Exercises; manage own Programs; assign/view only scoped Members.
MEMBER: read own Assignment/Schedule; start/log/finish own Sessions; read own
history/progress; never modify templates or another Member's data. Backend
authorization is mandatory; frontend guards are not security controls.

5. COACH-MEMBER RELATION
Reuse an equivalent relation when source evidence supports it. Otherwise design
CoachMemberAssignments(id, coach_id, member_id, assigned_by, status, start_date,
end_date, created_at, updated_at). Enforce one ACTIVE relation per pair. Coach
access requires ACTIVE scope; Admin has full scope; Member cannot create scope.

6. MIGRATION 0006 — WORKOUT FOUNDATION
Use compatible extensions discovered at the gate; proposed logical structures:
Exercises(id, name, slug, description, instructions, body_part, equipment,
difficulty, media_url, thumbnail_url, estimated_duration_seconds, is_active,
created_by, created_at, updated_at), difficulty BEGINNER/INTERMEDIATE/ADVANCED.
WorkoutPrograms(id, name, description, goal, difficulty, duration_weeks,
days_per_week, owner_coach_id, created_by, is_active, created_at, updated_at),
goal GENERAL_FITNESS/WEIGHT_LOSS/MUSCLE_GAIN/STRENGTH/ENDURANCE/MOBILITY.
WorkoutProgramDays(id, program_id, week_number, day_number, title, description,
sort_order, timestamps). WorkoutProgramExercises(id, program_day_id, exercise_id,
sort_order, target_sets, target_reps_min/max, target_weight,
target_duration_seconds, rest_seconds, tempo, coach_note, timestamps).
No hard delete after historical reference. Inactive Exercises cannot be newly
added; inactive Programs cannot be newly assigned. Enforce stable ordering/
uniqueness, safe positive numeric bounds, and at least reps or duration target.

7. 008A API AND UI
Implement Admin Exercise CRUD/list/status; Program CRUD/list/status; Program Day
create/update/delete/reorder; Program Exercise create/update/delete/reorder; and
Coach equivalents with owner enforcement. Admin routes:
/admin/exercises, /admin/exercises/new, /admin/exercises/:exerciseId/edit,
/admin/workout-programs, /admin/workout-programs/new,
/admin/workout-programs/:programId, /admin/workout-programs/:programId/edit.
Provide search/filter/sort/pagination, inline validation, React confirmation
dialogs and Program builder. Do not use window.alert/window.confirm.

8. MIGRATION 0007 — ASSIGNMENTS AND SESSIONS
Proposed logical structures: CoachMemberAssignments if needed;
MemberWorkoutAssignments(member_id, program_id, assigned_by, coach_id, start_date,
end_date, status, schedule_timezone, note, timestamps), status ACTIVE/PAUSED/
COMPLETED/CANCELLED; maximum one primary ACTIVE Assignment per Member. Coach may
assign only scoped Member; Member cannot change program_id.
MemberWorkoutSchedules(assignment_id, program_day_id, scheduled_date, status,
timestamps), status SCHEDULED/IN_PROGRESS/COMPLETED/SKIPPED/CANCELLED.
WorkoutSessions(member_id, assignment_id, schedule_id, program_id, program_day_id,
session_date, started_at, completed_at, status, total_duration_seconds,
member_note, timestamps), status SCHEDULED/IN_PROGRESS/COMPLETED/ABANDONED/
CANCELLED. Maximum one IN_PROGRESS Session per Member. Transitions:
SCHEDULED->IN_PROGRESS->COMPLETED; SCHEDULED->CANCELLED;
IN_PROGRESS->ABANDONED. Terminal states cannot transition or complete twice.
Completed Session logs are immutable in normal flow.

9. SESSION SNAPSHOT POLICY
At Session creation snapshot each Program Exercise into WorkoutSessionExercises:
Exercise ID/name, sort order, target sets/reps/weight/duration, rest seconds and
member-visible coach note. Later Program edits affect only Sessions not yet
created; historical integrity cannot depend on mutable templates.

10. SET LOGGING
WorkoutSetLogs(session_exercise_id, set_number, reps, weight_kg,
duration_seconds, distance_meters, completed, note, timestamps). Validate finite,
positive/zero-safe values. Set number is unique per Session Exercise. Only owning
Member may log while Session is IN_PROGRESS. No normal edits after COMPLETED.
Transactions/constraints must prevent duplicate set numbers under concurrency.

11. 008B API AND UI
Implement Admin/Coach Assignment APIs; Member self Assignment/Schedule list;
Session list/detail/create/start; Set create/update; Session complete/abandon/
cancel. Member routes: /workouts, /workouts/program, /workouts/schedule,
/workouts/sessions, /workouts/sessions/:sessionId. Required flow: Today's workout
-> detail -> Start -> Log sets -> Complete/Abandon -> History. No camera or
automatic rep counting.

12. MIGRATION 0008 AND PROGRESS
Create MemberProgressEntries only when manual measurement persistence is required;
avoid aggregate tables when queries suffice. Completed sessions = count COMPLETED.
Total duration = sum total_duration_seconds for COMPLETED. Training volume = sum
(reps * weight_kg) for completed sets belonging to COMPLETED Sessions. Completion
rate = completed due schedules / all due schedules * 100. Exclude future,
abandoned/cancelled Sessions and incomplete sets. Store UTC; aggregate/display by
Assignment/User IANA timezone, never server timezone. APIs: Member self summary,
Sessions, Exercise history, entries; Coach scoped Member progress; Admin progress.
Pages: /progress, /progress/sessions, /progress/exercises/:exerciseId,
/progress/measurements.

13. PRIVACY, SECURITY AND MEDIA
Workout/body metrics are personal: Member self, ACTIVE-scoped Coach, operational
Admin only; no public progress API or body-measurement logging. No diagnosis.
Identity comes from JWT, not request body. Use parameterized SQL, validation,
pagination/sort allowlists, transactions and locking for Assignment/Session races.
Audit existing MediaPlayer/media first. Exercise media is optional and must be a
public-relative path or HTTPS. Reject Windows absolute, file/javascript/data and
unsafe schemes. Do not download/generate Internet media or build a large video
upload system unless existing storage policy supports it.

14. ACCEPTANCE AND BUILD STRATEGY
Gate A after 008A, B after 008B, C after 008C, final build after final fixes.
Acceptance DB: GYMFIT_DB_TASK008_ACCEPTANCE_<timestamp>. Back up and verify before
each migration; preserve checksums; never edit applied migrations or seed canonical
DB with acceptance fixtures. Test Admin/Coach/Member authorization, cross-Member
IDOR, Coach scope, duplicate ACTIVE Assignment and IN_PROGRESS Session concurrency,
snapshot integrity, Set validation/concurrency, terminal transitions, formulas,
timezone, all three browser flows, cleanup and canonical integrity.

15. FINAL DEFINITION OF DONE
Discovery resolved; clean migrations; Exercise/Program, Assignment/Schedule,
Session/Snapshot/Set and progress complete; privacy/ownership pass; backend build/
lint/typecheck and frontend build/typecheck pass; API and Admin/Coach/Member browser
acceptance pass; isolated DB cleaned; canonical DB not acceptance-mutated; docs
updated; explicit commit and feature-branch push pass. Verdict only:
FULL_TASK_008_COMPLETE, PARTIALLY_COMPLETE or BLOCKED.

16. ONE-SHOT IMPLEMENTATION ORDER
1 Preflight. 2 Create/switch branch. 3 Discovery Gate. 4 Back up canonical.
5 0006 + 008A. 6 Gate A. 7 0007 + 008B. 8 Gate B. 9 0008 if needed + 008C.
10 Gate C. 11 Isolated full acceptance. 12 Fixes. 13 Final build/security scan.
14 Cleanup/integrity. 15 Status docs. 16 Explicit commit/push. 17 One final report.

17. IMPLEMENTATION FINAL REPORT (EXACT ORDER)
1 PREFLIGHT; 2 DISCOVERY GATE; 3 REUSE/EXTEND/REPLACE DECISIONS; 4 BRANCH;
5 CANONICAL BACKUP; 6 MIGRATION 0006; 7 EXERCISE LIBRARY; 8 WORKOUT PROGRAMS;
9 PROGRAM BUILDER; 10 BUILD GATE A; 11 MIGRATION 0007; 12 COACH-MEMBER SCOPE;
13 MEMBER ASSIGNMENTS; 14 MEMBER SCHEDULES; 15 WORKOUT SESSIONS;
16 SESSION SNAPSHOTS; 17 SET LOGGING; 18 BUILD GATE B; 19 MIGRATION 0008;
20 PROGRESS CALCULATIONS; 21 PROGRESS PRIVACY; 22 PROGRESS UI; 23 BUILD GATE C;
24 AUTHORIZATION; 25 IDOR; 26 CONCURRENCY; 27 ADMIN BROWSER; 28 COACH BROWSER;
29 MEMBER BROWSER; 30 FINAL BUILD; 31 SECURITY REVIEW; 32 ACCEPTANCE CLEANUP;
33 CANONICAL DATABASE INTEGRITY; 34 STATUS DOCUMENTS; 35 FILES CHANGED;
36 COMMIT; 37 PUSH; 38 REMAINING ISSUES; 39 FINAL VERDICT.
