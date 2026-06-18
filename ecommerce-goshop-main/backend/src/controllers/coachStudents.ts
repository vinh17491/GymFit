import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

export const getCoachStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const result = await pool.request().input("coachId", userId)
      .query(`SELECT u.Id, u.FullName, u.Email, u.Avatar, u.Phone,
        cs.AssignedAt, cs.Notes,
        (SELECT MAX(LogDate) FROM ProgressLogs WHERE UserId=u.Id) as LastProgressDate
        FROM CoachStudents cs JOIN Users u ON cs.StudentId = u.Id WHERE cs.CoachId = @coachId`);
    res.json(result.recordset);
  } catch (err) { next(err); }
};

export const getCoachStudentDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId } = req.params;
    const pool = await getPool();
    const student = await pool.request()
      .input("coachId", userId).input("studentId", studentId)
      .query(`SELECT u.Id, u.FullName, u.Email, u.Avatar, u.Phone, cs.AssignedAt, cs.Notes
        FROM CoachStudents cs JOIN Users u ON cs.StudentId = u.Id WHERE cs.CoachId = @coachId AND cs.StudentId = @studentId`);
    if (!student.recordset[0]) return res.status(404).json({ message: "Student not found" });
    const health = await pool.request().input("userId", studentId)
      .query("SELECT TOP 1 * FROM HealthProfiles WHERE UserId=@userId ORDER BY UpdatedAt DESC");
    const progress = await pool.request().input("userId", studentId)
      .query("SELECT TOP(10) * FROM ProgressLogs WHERE UserId=@userId ORDER BY LogDate DESC");
    const workoutLogs = await pool.request().input("userId", studentId)
      .query("SELECT TOP(10) * FROM WorkoutLogs WHERE UserId=@userId ORDER BY LogDate DESC");
    res.json({ ...student.recordset[0], healthProfile: health.recordset[0] || null, progress: progress.recordset, workoutLogs: workoutLogs.recordset });
  } catch (err) { next(err); }
};

export const assignStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId, notes } = req.body;
    const pool = await getPool();
    const existing = await pool.request()
      .input("coachId", userId).input("studentId", studentId)
      .query("SELECT * FROM CoachStudents WHERE CoachId=@coachId AND StudentId=@studentId");
    if (existing.recordset.length > 0) return res.status(400).json({ message: "Already assigned" });
    const result = await pool.request()
      .input("coachId", userId).input("studentId", studentId).input("notes", notes || null)
      .query("INSERT INTO CoachStudents (CoachId, StudentId, Notes) OUTPUT INSERTED.* VALUES (@coachId, @studentId, @notes)");
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const removeStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId } = req.params;
    const pool = await getPool();
    await pool.request().input("coachId", userId).input("studentId", studentId)
      .query("DELETE FROM CoachStudents WHERE CoachId=@coachId AND StudentId=@studentId");
    res.json({ message: "Student removed" });
  } catch (err) { next(err); }
};

export const overrideWorkoutPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId, programId, customExercises, notes } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input("coachId", userId).input("studentId", studentId)
      .input("programId", programId || null).input("customExercises", customExercises || null)
      .input("notes", notes || null)
      .query(`INSERT INTO CoachOverrides (CoachId, StudentId, OverrideType, ProgramId, CustomData, Notes)
        VALUES (@coachId, @studentId, 'WORKOUT', @programId, @customExercises, @notes);
        SELECT SCOPE_IDENTITY() AS Id`);
    res.status(201).json({ id: result.recordset[0].Id });
  } catch (err) { next(err); }
};

export const overrideMealPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId, mealPlanId, customData, notes } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input("coachId", userId).input("studentId", studentId)
      .input("mealPlanId", mealPlanId || null).input("customData", customData || null)
      .input("notes", notes || null)
      .query(`INSERT INTO CoachOverrides (CoachId, StudentId, OverrideType, ProgramId, CustomData, Notes)
        VALUES (@coachId, @studentId, 'MEAL', @mealPlanId, @customData, @notes);
        SELECT SCOPE_IDENTITY() AS Id`);
    res.status(201).json({ id: result.recordset[0].Id });
  } catch (err) { next(err); }
};

export const getCoachOverrides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { studentId } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input("coachId", userId).input("studentId", studentId)
      .query("SELECT * FROM CoachOverrides WHERE CoachId=@coachId AND StudentId=@studentId ORDER BY CreatedAt DESC");
    res.json(result.recordset);
  } catch (err) { next(err); }
};