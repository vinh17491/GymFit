import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import * as controller from './coach-workspace.controller';
import * as availabilityController from '../coaches/coach-availability.controller';
import { AVAILABILITY_EXCEPTION_TYPES, AVAILABILITY_MODES } from '../coaches/coach-availability.service';

const router = Router();
const id = z.object({ programId: z.coerce.number().int().positive() }).strict();
const programId = id;
const dayId = z.object({ dayId: z.coerce.number().int().positive() }).strict();
const programExerciseId = z.object({ programExerciseId: z.coerce.number().int().positive() }).strict();
const memberId = z.object({ memberId: z.coerce.number().int().positive() }).strict();
const memberContext = z.object({
  goal: z.string().trim().max(2000).nullable().optional(),
  limitations: z.string().trim().max(2000).nullable().optional(),
  privateNote: z.string().trim().max(4000).nullable().optional(),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  expectedUpdatedAt: z.string().trim().min(19).max(33).nullable().optional(),
}).strict();
const assignmentId = z.object({ assignmentId: z.coerce.number().int().positive() }).strict();
const scheduleId = z.object({ scheduleId: z.coerce.number().int().positive() }).strict();
const sourceSessionId = z.object({ memberId: z.coerce.number().int().positive(), source: z.enum(['legacy', 'member']), sessionId: z.coerce.number().int().positive() }).strict();
const legacySessionId = z.object({ memberId: z.coerce.number().int().positive(), sessionId: z.coerce.number().int().positive() }).strict();
const list = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), q: z.string().trim().max(100).optional() }).strict();
const exerciseList = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), q: z.string().trim().max(100).optional(), muscleGroup: z.string().trim().max(100).optional(), difficulty: z.string().trim().max(40).optional(), equipment: z.string().trim().max(100).optional(), sort: z.enum(['name_asc','name_desc','newest']).default('name_asc') }).strict();
const program = z.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(10000).optional(), goal: z.enum(['GENERAL_FITNESS','WEIGHT_LOSS','MUSCLE_GAIN','STRENGTH','ENDURANCE','MOBILITY']), difficulty: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']), durationWeeks: z.number().int().min(1).max(104), daysPerWeek: z.number().int().min(1).max(7) }).strict();
const day = z.object({ weekNumber: z.number().int().min(1).max(104), dayNumber: z.number().int().min(1).max(7), title: z.string().trim().min(1).max(200), description: z.string().trim().max(10000).optional() }).strict();
const targetFields = { targetSets: z.number().int().min(1).max(50).nullable().optional(), targetRepsMin: z.number().int().min(1).max(1000).nullable().optional(), targetRepsMax: z.number().int().min(1).max(1000).nullable().optional(), targetWeight: z.number().finite().min(0).max(100000).nullable().optional(), targetDurationSeconds: z.number().int().min(1).max(86400).nullable().optional(), restSeconds: z.number().int().min(0).max(3600).nullable().optional(), tempo: z.string().trim().max(40).nullable().optional(), coachNote: z.string().trim().max(2000).nullable().optional() };
function validateExerciseTargets(value: { targetRepsMin?: number | null; targetRepsMax?: number | null; targetDurationSeconds?: number | null }, context: z.RefinementCtx): void {
  if (value.targetRepsMin == null && value.targetRepsMax == null && value.targetDurationSeconds == null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetRepsMin'], message: 'At least a reps or duration target is required' });
  }
  if (value.targetRepsMin != null && value.targetRepsMax != null && value.targetRepsMin > value.targetRepsMax) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetRepsMin'], message: 'targetRepsMin must not exceed targetRepsMax' });
  }
}
const programExercise = z.object({ exerciseId: z.number().int().positive(), ...targetFields }).strict().superRefine(validateExerciseTargets);
const programExerciseUpdate = z.object(targetFields).strict().superRefine(validateExerciseTargets);
const reorder = z.object({ ids: z.array(z.number().int().positive()).min(0).max(200) }).strict();
const assignment = z.object({ memberId: z.number().int().positive(), programId: z.number().int().positive(), startDate: z.string(), endDate: z.string().optional().nullable(), scheduleTimezone: z.string().trim().min(1).max(64), note: z.string().trim().max(2000).optional().nullable() }).strict();
const transition = z.object({}).strict();
const scheduleList = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), memberId: z.coerce.number().int().positive().optional(), fromDate: z.string().optional(), toDate: z.string().optional() }).strict();
const generate = z.object({ fromDate: z.string().optional(), horizonDays: z.number().int().min(1).max(90).default(30) }).strict();
const rescheduleSchema = z.object({ scheduledDate: z.string() }).strict();
const coachProfile = z.object({
  specialty: z.string().trim().max(200).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  experienceYears: z.number().int().min(0).max(80).nullable().optional(),
  sessionMode: z.enum(['ONLINE', 'IN_PERSON', 'BOTH']).nullable().optional(),
  location: z.string().trim().max(255).nullable().optional(),
  bookingEnabled: z.boolean().optional(),
}).strict();
const availabilityDateQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict();
const availabilityListQuery = z.object({ includeInactive: z.enum(['true', 'false']).optional().transform(value => value === 'true') }).strict();
const ruleId = z.object({ ruleId: z.coerce.number().int().positive() }).strict();
const exceptionId = z.object({ exceptionId: z.coerce.number().int().positive() }).strict();
const ruleInput = z.object({
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  mode: z.enum(AVAILABILITY_MODES),
  location: z.string().trim().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();
const rulePatch = ruleInput.partial();
const exceptionInput = z.object({
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exceptionType: z.enum(AVAILABILITY_EXCEPTION_TYPES),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  mode: z.enum(AVAILABILITY_MODES).nullable().optional(),
  location: z.string().trim().max(255).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();
const exceptionPatch = exceptionInput.partial();

router.use(authenticate, authorize(UserRole.COACH));
router.get('/dashboard', controller.getDashboard);
router.get('/profile', controller.getSelfProfile);
router.patch('/profile', validate(coachProfile), controller.updateSelfProfile);
router.get('/availability', validate(availabilityDateQuery, 'query'), availabilityController.getSelfAvailability);
router.get('/availability/rules', validate(availabilityListQuery, 'query'), availabilityController.listRules);
router.post('/availability/rules', validate(ruleInput), availabilityController.createRule);
router.patch('/availability/rules/:ruleId', validate(ruleId, 'params'), validate(rulePatch), availabilityController.updateRule);
router.delete('/availability/rules/:ruleId', validate(ruleId, 'params'), availabilityController.deleteRule);
router.get('/availability/exceptions', validate(availabilityListQuery, 'query'), availabilityController.listExceptions);
router.post('/availability/exceptions', validate(exceptionInput), availabilityController.createException);
router.patch('/availability/exceptions/:exceptionId', validate(exceptionId, 'params'), validate(exceptionPatch), availabilityController.updateException);
router.delete('/availability/exceptions/:exceptionId', validate(exceptionId, 'params'), availabilityController.deleteException);
router.get('/exercises', validate(exerciseList, 'query'), controller.listExercises);
router.get('/exercises/:exerciseId', validate(z.object({ exerciseId: z.coerce.number().int().positive() }).strict(), 'params'), controller.getExercise);
router.get('/workout-programs', validate(list, 'query'), controller.listPrograms);
router.post('/workout-programs', validate(program), controller.createProgram);
router.get('/workout-programs/:programId', validate(programId, 'params'), controller.getProgram);
router.patch('/workout-programs/:programId', validate(programId, 'params'), validate(program), controller.updateProgram);
router.post('/workout-programs/:programId/publish', validate(programId, 'params'), validate(transition), controller.publishProgram);
router.post('/workout-programs/:programId/clone-version', validate(programId, 'params'), validate(transition), controller.cloneProgramVersion);
router.post('/workout-programs/:programId/archive', validate(programId, 'params'), validate(transition), controller.archiveProgram);
router.post('/workout-programs/:programId/activate', validate(programId, 'params'), validate(transition), controller.activateProgram);
router.post('/workout-programs/:programId/deactivate', validate(programId, 'params'), validate(transition), controller.deactivateProgram);
router.post('/workout-programs/:programId/days', validate(programId, 'params'), validate(day), controller.createDay);
router.post('/workout-programs/:programId/days/reorder', validate(programId, 'params'), validate(reorder), controller.reorderDays);
router.patch('/workout-program-days/:dayId', validate(dayId, 'params'), validate(day), controller.updateDay);
router.delete('/workout-program-days/:dayId', validate(dayId, 'params'), controller.deleteDay);
router.post('/workout-program-days/:dayId/exercises', validate(dayId, 'params'), validate(programExercise), controller.createProgramExercise);
router.post('/workout-program-days/:dayId/exercises/reorder', validate(dayId, 'params'), validate(reorder), controller.reorderProgramExercises);
router.patch('/workout-program-exercises/:programExerciseId', validate(programExerciseId, 'params'), validate(programExerciseUpdate), controller.updateProgramExercise);
router.delete('/workout-program-exercises/:programExerciseId', validate(programExerciseId, 'params'), controller.deleteProgramExercise);
router.get('/members', validate(list, 'query'), controller.listMembers);
router.get('/members/:memberId', validate(memberId, 'params'), controller.getMember);
router.get('/members/:memberId/context', validate(memberId, 'params'), controller.getMemberContext);
router.patch('/members/:memberId/context', validate(memberId, 'params'), validate(memberContext), controller.updateMemberContext);
router.get('/assignments', validate(list.extend({ memberId: z.coerce.number().int().positive().optional() }), 'query'), controller.listAssignments);
router.post('/assignments', validate(assignment), controller.createAssignment);
router.get('/assignments/:assignmentId', validate(assignmentId, 'params'), controller.getAssignment);
router.post('/assignments/:assignmentId/pause', validate(assignmentId, 'params'), validate(transition), controller.pauseAssignment);
router.post('/assignments/:assignmentId/resume', validate(assignmentId, 'params'), validate(transition), controller.resumeAssignment);
router.post('/assignments/:assignmentId/complete', validate(assignmentId, 'params'), validate(transition), controller.completeAssignment);
router.post('/assignments/:assignmentId/cancel', validate(assignmentId, 'params'), validate(transition), controller.cancelAssignment);
router.get('/schedules', validate(scheduleList, 'query'), controller.listSchedules);
router.post('/assignments/:assignmentId/schedules/generate', validate(assignmentId, 'params'), validate(generate), controller.generateSchedules);
router.post('/schedules/:scheduleId/reschedule', validate(scheduleId, 'params'), validate(rescheduleSchema), controller.reschedule);
router.post('/schedules/:scheduleId/cancel', validate(scheduleId, 'params'), validate(transition), controller.cancelSchedule);
router.get('/members/:memberId/sessions', validate(memberId, 'params'), validate(list, 'query'), controller.listSessions);
router.get('/members/:memberId/sessions/:source/:sessionId', validate(sourceSessionId, 'params'), controller.getSession);
router.get('/members/:memberId/sessions/:sessionId', validate(legacySessionId, 'params'), controller.getSession);
router.get('/members/:memberId/progress', validate(memberId, 'params'), controller.getProgress);
export default router;
