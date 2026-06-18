import { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';

type AuthRequest = Request & { userId?: number };

export class LogbookController {
    async logWorkout(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).userId;
            const { programId, exerciseName, sets, reps, weightKg, notes } = req.body;
            const pool = await getPool();
            
            await pool.request()
                .input('UserId', sql.Int, userId)
                .input('ProgramId', sql.Int, programId || null)
                .input('ExerciseName', sql.NVarChar(200), exerciseName)
                .input('Sets', sql.Int, sets)
                .input('Reps', sql.Int, reps)
                .input('WeightKg', sql.Decimal(5, 2), weightKg)
                .input('Notes', sql.NVarChar(500), notes)
                .query(`
                    INSERT INTO WorkoutLogs (UserId, ProgramId, ExerciseName, Sets, Reps, WeightKg, Notes, LogDate)
                    VALUES (@UserId, @ProgramId, @ExerciseName, @Sets, @Reps, @WeightKg, @Notes, GETUTCDATE())
                `);
            
            res.status(201).json({ message: 'Workout logged successfully' });
        } catch (error) {
            next(error);
        }
    }

    async logNutrition(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).userId;
            const { mealType, foodName, calories, protein, carbs, fat } = req.body;
            const pool = await getPool();

            await pool.request()
                .input('UserId', sql.Int, userId)
                .input('MealType', sql.NVarChar(50), mealType)
                .input('FoodName', sql.NVarChar(200), foodName)
                .input('Calories', sql.Int, calories)
                .input('Protein', sql.Decimal(5, 2), protein)
                .input('Carbs', sql.Decimal(5, 2), carbs)
                .input('Fat', sql.Decimal(5, 2), fat)
                .query(`
                    INSERT INTO NutritionLogs (UserId, MealType, FoodName, Calories, Protein, Carbs, Fat, LogDate)
                    VALUES (@UserId, @MealType, @FoodName, @Calories, @Protein, @Carbs, @Fat, GETUTCDATE())
                `);

            res.status(201).json({ message: 'Nutrition logged successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getMemberLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as AuthRequest).userId;
            const pool = await getPool();
            
            const workoutLogs = await pool.request()
                .input('UserId', sql.Int, userId)
                .query('SELECT TOP 50 * FROM WorkoutLogs WHERE UserId = @UserId ORDER BY LogDate DESC');
            
            const nutritionLogs = await pool.request()
                .input('UserId', sql.Int, userId)
                .query('SELECT TOP 50 * FROM NutritionLogs WHERE UserId = @UserId ORDER BY LogDate DESC');

            res.json({
                workouts: workoutLogs.recordset,
                nutrition: nutritionLogs.recordset
            });
        } catch (error) {
            next(error);
        }
    }
}