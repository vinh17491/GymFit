import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

// GET /diet - Get all diet plans
export const getAllDietPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT dp.*, u.FullName AS CoachName, u.Avatar AS CoachAvatar,
               (SELECT COUNT(*) FROM DietPlanSaves WHERE DietPlanId = dp.Id) AS SaveCount
        FROM DietPlans dp
        LEFT JOIN Users u ON dp.CoachId = u.Id
        WHERE dp.Status = 'ACTIVE'
        ORDER BY dp.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch diet plans", error });
  }
};

// GET /diet/:id - Get diet plan by ID
export const getDietPlanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(req.params.id))
      .query(`
        SELECT dp.*, u.FullName AS CoachName, u.Avatar AS CoachAvatar
        FROM DietPlans dp
        LEFT JOIN Users u ON dp.CoachId = u.Id
        WHERE dp.Id = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Diet plan not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch diet plan", error });
  }
};

// POST /diet - Create a diet plan (coach/admin)
export const createDietPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, dailyCalories, meals, durationDays, memberId } = req.body;
    if (!title || !meals || !durationDays) {
      return res.status(400).json({ message: "title, meals, and durationDays are required" });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("memberId", memberId || req.userId)
      .input("title", title)
      .input("description", description || "")
      .input("dailyCalories", dailyCalories || 0)
      .input("meals", JSON.stringify(meals))
      .input("durationDays", durationDays)
      .query(`
        INSERT INTO DietPlans (MemberId, Title, Description, DailyCalories, Meals, DurationDays, Status, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.*
        VALUES (@memberId, @title, @description, @dailyCalories, @meals, @durationDays, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create diet plan", error });
  }
};

// POST /diet/:id/save - Save a diet plan
export const saveDietPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const dietPlanId = Number(req.params.id);
    const pool = await getPool();

    // Check if already saved
    const existing = await pool.request()
      .input("userId", userId)
      .input("dietPlanId", dietPlanId)
      .query("SELECT Id FROM DietPlanSaves WHERE UserId = @userId AND DietPlanId = @dietPlanId");
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: "Diet plan already saved" });
    }

    await pool.request()
      .input("userId", userId)
      .input("dietPlanId", dietPlanId)
      .query("INSERT INTO DietPlanSaves (UserId, DietPlanId, CreatedAt) VALUES (@userId, @dietPlanId, GETUTCDATE())");
    res.status(201).json({ message: "Diet plan saved successfully" });
  } catch (error) {
    next({ message: "Unable to save diet plan", error });
  }
};

// DELETE /diet/:id/save - Unsave a diet plan
export const unsaveDietPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const dietPlanId = Number(req.params.id);
    const pool = await getPool();
    await pool.request()
      .input("userId", userId)
      .input("dietPlanId", dietPlanId)
      .query("DELETE FROM DietPlanSaves WHERE UserId = @userId AND DietPlanId = @dietPlanId");
    res.status(200).json({ message: "Diet plan unsaved successfully" });
  } catch (error) {
    next({ message: "Unable to unsave diet plan", error });
  }
};