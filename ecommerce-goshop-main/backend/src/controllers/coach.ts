import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";
import stripe from "../config/stripe";

// GET /coaches - List all available coaches (public)
export const getAllCoaches = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT c.*, u.FullName, u.Email, u.Avatar
        FROM Coaches c
        JOIN Users u ON c.UserId = u.Id
        WHERE c.IsAvailable = 1 AND u.IsActive = 1
        ORDER BY c.Rating DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch coaches", error });
  }
};

// GET /coaches/:id - Get coach detail (public)
export const getCoachById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = Number(req.params.id);
    const pool = await getPool();
    const result = await pool.request()
      .input("id", coachId)
      .query(`
        SELECT c.*, u.FullName, u.Email, u.Avatar
        FROM Coaches c
        JOIN Users u ON c.UserId = u.Id
        WHERE c.Id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Coach not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch coach", error });
  }
};

// GET /coaches/:id/schedules - Get coach schedules (public)
export const getCoachSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = Number(req.params.id);
    const pool = await getPool();
    const result = await pool.request()
      .input("coachId", coachId)
      .query(`
        SELECT * FROM CoachSchedules
        WHERE CoachId = @coachId AND IsBooked = 0
        ORDER BY DayOfWeek, StartTime
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch coach schedules", error });
  }
};

// ============= ADMIN ENDPOINTS =============

// POST /coaches/admin - Create a coach profile for a user
export const createCoach = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, Specialization, Bio, ExperienceYears, HourlyRate, Certifications } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const pool = await getPool();

    // Check user exists and has role COACH
    const userResult = await pool.request()
      .input("userId", Number(userId))
      .query(`
        SELECT u.Id, r.Name AS RoleName FROM Users u
        JOIN Roles r ON u.RoleId = r.Id
        WHERE u.Id = @userId AND u.IsActive = 1
      `);
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if coach profile already exists
    const existingCoach = await pool.request()
      .input("userId", Number(userId))
      .query("SELECT Id FROM Coaches WHERE UserId = @userId");
    if (existingCoach.recordset.length > 0) {
      return res.status(400).json({ message: "Coach profile already exists for this user" });
    }

    const result = await pool.request()
      .input("userId", Number(userId))
      .input("specialization", Specialization || null)
      .input("bio", Bio || null)
      .input("experienceYears", ExperienceYears ? Number(ExperienceYears) : null)
      .input("hourlyRate", HourlyRate ? Number(HourlyRate) : null)
      .input("certifications", Certifications || null)
      .query(`
        INSERT INTO Coaches (UserId, Specialization, Bio, ExperienceYears, HourlyRate, Certifications, IsAvailable, Rating)
        OUTPUT INSERTED.*
        VALUES (@userId, @specialization, @bio, @experienceYears, @hourlyRate, @certifications, 1, 0.0)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create coach", error });
  }
};

// PUT /coaches/admin/:id - Update a coach profile
export const updateCoach = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = Number(req.params.id);
    const { Specialization, Bio, ExperienceYears, HourlyRate, Certifications, IsAvailable } = req.body;
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", coachId)
      .query("SELECT Id FROM Coaches WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const result = await pool.request()
      .input("id", coachId)
      .input("specialization", Specialization !== undefined ? Specialization : null)
      .input("bio", Bio !== undefined ? Bio : null)
      .input("experienceYears", ExperienceYears !== undefined ? Number(ExperienceYears) : null)
      .input("hourlyRate", HourlyRate !== undefined ? Number(HourlyRate) : null)
      .input("certifications", Certifications !== undefined ? Certifications : null)
      .input("isAvailable", IsAvailable !== undefined ? (IsAvailable ? 1 : 0) : null)
      .query(`
        UPDATE Coaches SET
          Specialization = CASE WHEN @specialization IS NULL AND @id IS NOT NULL THEN Specialization ELSE @specialization END,
          Bio = CASE WHEN @bio IS NULL AND @id IS NOT NULL THEN Bio ELSE @bio END,
          ExperienceYears = COALESCE(@experienceYears, ExperienceYears),
          HourlyRate = COALESCE(@hourlyRate, HourlyRate),
          Certifications = CASE WHEN @certifications IS NULL AND @id IS NOT NULL THEN Certifications ELSE @certifications END,
          IsAvailable = COALESCE(@isAvailable, CASE WHEN IsAvailable = 1 THEN 1 ELSE 0 END)
        OUTPUT INSERTED.*
        WHERE Id = @id
      `);
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update coach", error });
  }
};

// DELETE /coaches/admin/:id - Delete a coach profile (soft - set unavailable)
export const deleteCoach = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = Number(req.params.id);
    const pool = await getPool();

    const existing = await pool.request()
      .input("id", coachId)
      .query("SELECT Id FROM Coaches WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Coach not found" });
    }

    // Soft delete - mark unavailable
    await pool.request()
      .input("id", coachId)
      .query("UPDATE Coaches SET IsAvailable = 0 WHERE Id = @id");
    res.status(200).json({ message: "Coach deactivated successfully" });
  } catch (error) {
    next({ message: "Unable to delete coach", error });
  }
};