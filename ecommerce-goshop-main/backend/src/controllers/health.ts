import { Request, Response } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';

type AuthRequest = Request & { userId?: number };

export class HealthController {
    async calculateBMI(req: Request, res: Response) {
        try {
            const { WeightKg, HeightCm } = req.body;
            if (!WeightKg || !HeightCm) {
                return res.status(400).json({ message: 'Weight and height are required' });
            }
            const heightM = HeightCm / 100;
            const bmi = WeightKg / (heightM * heightM);
            let status = 'Normal';
            if (bmi < 18.5) status = 'Underweight';
            else if (bmi >= 25 && bmi < 29.9) status = 'Overweight';
            else if (bmi >= 30) status = 'Obese';
            res.json({ bmi: Math.round(bmi * 10) / 10, status });
        } catch (error) {
            res.status(500).json({ message: 'Failed to calculate BMI' });
        }
    }

    async calculateBodyFat(req: Request, res: Response) {
        try {
            const { Gender, WaistCm, NeckCm, HeightCm, HipCm } = req.body;
            if (!Gender || !WaistCm || !NeckCm || !HeightCm || (Gender === 'FEMALE' && !HipCm)) {
                return res.status(400).json({ message: 'All required measurements must be provided' });
            }
            let bodyFatPct = 0;
            if (Gender === 'MALE') {
                bodyFatPct = 495 / (1.0324 - 0.19077 * Math.log10(WaistCm - NeckCm) + 0.15456 * Math.log10(HeightCm)) - 450;
            } else {
                bodyFatPct = 495 / (1.29579 - 0.35004 * Math.log10(WaistCm + HipCm - NeckCm) + 0.22100 * Math.log10(HeightCm)) - 450;
            }
            res.json({ bodyFatPct: Math.round(bodyFatPct * 10) / 10 });
        } catch (error) {
            res.status(500).json({ message: 'Failed to calculate body fat' });
        }
    }

    async getHealthProfile(req: AuthRequest, res: Response) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('UserId', sql.Int, req.userId)
                .query('SELECT * FROM HealthProfiles WHERE UserId = @UserId');
            if (result.recordset.length === 0) return res.json(null);
            res.json(result.recordset[0]);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch health profile' });
        }
    }

    async updateHealthProfile(req: AuthRequest, res: Response) {
        try {
            const { Gender, DateOfBirth, HeightCm, WeightKg, NeckCm, WaistCm, HipCm, FitnessGoal, ActivityLevel } = req.body;
            const pool = await getPool();
            const userId = req.userId;
            const existing = await pool.request().input('UserId', sql.Int, userId)
                .query('SELECT Id FROM HealthProfiles WHERE UserId = @UserId');

            let bmi = null, bodyFatPct = null;
            if (HeightCm && WeightKg) {
                const h = HeightCm / 100;
                bmi = Math.round((WeightKg / (h * h)) * 10) / 10;
            }
            if (Gender && WaistCm && NeckCm && HeightCm) {
                if (Gender === 'MALE') {
                    bodyFatPct = Math.round((495 / (1.0324 - 0.19077 * Math.log10(WaistCm - NeckCm) + 0.15456 * Math.log10(HeightCm)) - 450) * 10) / 10;
                } else if (HipCm) {
                    bodyFatPct = Math.round((495 / (1.29579 - 0.35004 * Math.log10(WaistCm + HipCm - NeckCm) + 0.22100 * Math.log10(HeightCm)) - 450) * 10) / 10;
                }
            }

            if (existing.recordset.length > 0) {
                await pool.request().input('UserId', sql.Int, userId).input('Gender', sql.NVarChar(10), Gender)
                    .input('DateOfBirth', sql.Date, DateOfBirth || null).input('HeightCm', sql.Decimal(5,2), HeightCm)
                    .input('WeightKg', sql.Decimal(5,2), WeightKg).input('NeckCm', sql.Decimal(5,2), NeckCm)
                    .input('WaistCm', sql.Decimal(5,2), WaistCm).input('HipCm', sql.Decimal(5,2), HipCm || null)
                    .input('FitnessGoal', sql.NVarChar(50), FitnessGoal || null).input('ActivityLevel', sql.NVarChar(30), ActivityLevel || null)
                    .query(`UPDATE HealthProfiles SET Gender=@Gender,DateOfBirth=@DateOfBirth,HeightCm=@HeightCm,WeightKg=@WeightKg,NeckCm=@NeckCm,WaistCm=@WaistCm,HipCm=@HipCm,FitnessGoal=@FitnessGoal,ActivityLevel=@ActivityLevel,UpdatedAt=GETUTCDATE() WHERE UserId=@UserId`);
            } else {
                await pool.request().input('UserId', sql.Int, userId).input('Gender', sql.NVarChar(10), Gender)
                    .input('DateOfBirth', sql.Date, DateOfBirth || null).input('HeightCm', sql.Decimal(5,2), HeightCm)
                    .input('WeightKg', sql.Decimal(5,2), WeightKg).input('NeckCm', sql.Decimal(5,2), NeckCm)
                    .input('WaistCm', sql.Decimal(5,2), WaistCm).input('HipCm', sql.Decimal(5,2), HipCm || null)
                    .input('FitnessGoal', sql.NVarChar(50), FitnessGoal || null).input('ActivityLevel', sql.NVarChar(30), ActivityLevel || null)
                    .query(`INSERT INTO HealthProfiles (UserId,Gender,DateOfBirth,HeightCm,WeightKg,NeckCm,WaistCm,HipCm,FitnessGoal,ActivityLevel) VALUES (@UserId,@Gender,@DateOfBirth,@HeightCm,@WeightKg,@NeckCm,@WaistCm,@HipCm,@FitnessGoal,@ActivityLevel)`);
            }
            res.json({ message: 'Health profile saved!', bmi, bodyFatPct });
        } catch (error) {
            console.error('Update Health Profile Error:', error);
            res.status(500).json({ message: 'Failed to update health profile' });
        }
    }

    async getFreeTrialStatus(req: AuthRequest, res: Response) {
        try {
            const pool = await getPool();
            const result = await pool.request().input('UserId', sql.Int, req.userId)
                .query(`SELECT HasFreeTrialUsed, FreeTrialEndDate, DATEDIFF(day, GETDATE(), FreeTrialEndDate) as DaysRemaining FROM Users WHERE Id = @UserId`);
            if (result.recordset.length === 0) return res.status(404).json({ message: 'User not found' });
            const user = result.recordset[0];
            const isActive = user.FreeTrialEndDate && new Date(user.FreeTrialEndDate) > new Date();
            res.json({ hasTrial: user.HasFreeTrialUsed, isActive: !!isActive, endDate: user.FreeTrialEndDate, daysRemaining: isActive ? user.DaysRemaining : 0 });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch trial status' });
        }
    }

    async startFreeTrial(req: AuthRequest, res: Response) {
        try {
            const pool = await getPool();
            const check = await pool.request().input('UserId', sql.Int, req.userId)
                .query('SELECT HasFreeTrialUsed FROM Users WHERE Id = @UserId');
            if (check.recordset[0]?.HasFreeTrialUsed) return res.status(400).json({ message: 'Free trial already used' });
            const endDate = new Date(); endDate.setDate(endDate.getDate() + 14);
            await pool.request().input('UserId', sql.Int, req.userId).input('EndDate', sql.DateTime, endDate)
                .query(`UPDATE Users SET HasFreeTrialUsed=1, FreeTrialEndDate=@EndDate WHERE Id=@UserId`);
            res.json({ message: 'Free trial started!', endDate });
        } catch (error) {
            res.status(500).json({ message: 'Failed to start free trial' });
        }
    }
}