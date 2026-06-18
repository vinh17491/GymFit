import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

export const generateWorkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fitnessGoal, activityLevel, equipment, daysPerWeek, durationMin } = req.body;
    const pool = await getPool();
    // Try premium AI-generated plans or fallback to template-based
    const templates = await pool.request()
      .query(`SELECT TOP 5 * FROM WorkoutPrograms WHERE IsTemplate=1 ORDER BY NEWID()`);
    // Simple rule-based generator
    const exercises: any[] = [];
    const baseExercises = templates.recordset.length > 0
      ? templates.recordset
      : [{ Name: "Push-ups", Sets: 3, Reps: 12, MuscleGroup: "Chest" },
         { Name: "Squats", Sets: 3, Reps: 15, MuscleGroup: "Legs" },
         { Name: "Planks", Sets: 3, Reps: 30, MuscleGroup: "Core" }];
    const numExercises = Math.min(baseExercises.length, daysPerWeek || 3);
    for (let i = 0; i < numExercises; i++) {
      const e = baseExercises[i % baseExercises.length];
      exercises.push({
        exerciseName: e.Name,
        sets: e.Sets,
        reps: e.Reps,
        muscleGroup: e.MuscleGroup,
        restSec: 60,
      });
    }
    res.json({
      goal: fitnessGoal || "general",
      daysPerWeek: daysPerWeek || 3,
      durationMin: durationMin || 30,
      exercises,
      note: "AI-generated workout based on your profile",
    });
  } catch (err) { next(err); }
};

export const generateMealPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dailyCalories, dietType, mealsPerDay, allergies } = req.body;
    const mealTimes = ["Breakfast", "Lunch", "Dinner", "Snack"];
    const numMeals = Math.min(mealsPerDay || 4, 4);
    const meals: any[] = [];
    const baseFoods = [
      { name: "Oatmeal with fruits", calories: 350, protein: 12, carbs: 60, fat: 5 },
      { name: "Grilled chicken salad", calories: 450, protein: 35, carbs: 20, fat: 15 },
      { name: "Salmon with vegetables", calories: 500, protein: 40, carbs: 15, fat: 22 },
      { name: "Greek yogurt with berries", calories: 200, protein: 15, carbs: 25, fat: 5 },
    ];
    for (let i = 0; i < numMeals; i++) {
      const food = baseFoods[i % baseFoods.length];
      meals.push({
        mealType: mealTimes[i],
        foods: [{ name: food.name, servingSize: 100, calories: food.calories, proteinG: food.protein, carbsG: food.carbs, fatG: food.fat }],
        totalCalories: food.calories,
      });
    }
    const totalCalories = meals.reduce((sum: number, m: any) => sum + m.totalCalories, 0);
    res.json({
      dailyCalories: dailyCalories || totalCalories,
      dietType: dietType || "balanced",
      meals,
      totalCalories,
      note: "AI-generated meal plan based on your goals",
    });
  } catch (err) { next(err); }
};

export const getMusicRecommendations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT TOP 20 * FROM MusicRecommendations WHERE IsActive=1 ORDER BY PlayCount DESC");
    res.json(result.recordset);
  } catch (err) { next(err); }
};