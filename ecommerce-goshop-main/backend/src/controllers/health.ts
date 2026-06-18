import { Request, Response } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';

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

            res.json({
                bmi: Math.round(bmi * 10) / 10,
                status
            });
        } catch (error) {
            console.error('Calculate BMI Error:', error);
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

            res.json({
                bodyFatPct: Math.round(bodyFatPct * 10) / 10
            });
        } catch (error) {
            console.error('Calculate Body Fat Error:', error);
            res.status(500).json({ message: 'Failed to calculate body fat' });
        }
    }

    async getHealthProfile(req: any, res: Response) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('UserId', sql.Int, req.user?.id)
                .query(`
                    SELECT * FROM HealthProfiles 
                    WHERE UserId = @UserId
                `);

            if (result.recordset.length === 0) {
                return res.json(null);
            }

            res.json(result.recordset[0]);
        } catch (error) {
            console.error('Get Health Profile Error:', error);
            res.status(500).json({ message: 'Failed to fetch health profile' });
        }
    }

    async updateHealthProfile(req: any, res: Response) {
        try {
            const { HeightCm, WeightKg, TargetWeightKg, ActivityLevel, DietPreference } = req.body;
            const pool = await getPool();

            const existingProfile = await pool.request()
                .input('UserId', sql.Int, req.user?.id)
                .query('SELECT Id FROM HealthProfiles WHERE UserId = @UserId');

            if (existingProfile.recordset.length > 0) {
                await pool.request()
                    .input('UserId', sql.Int, req.user?.id)
                    .input('HeightCm', sql.Decimal(5, 2), HeightCm)
                    .input('WeightKg', sql.Decimal(5, 2), WeightKg)
                    .input('TargetWeightKg', sql.Decimal(5, 2), TargetWeightKg)
                    .input('ActivityLevel', sql.NVarChar(50), ActivityLevel)
                    .input('DietPreference', sql.NVarChar(50), DietPreference)
                    .query(`
                        UPDATE HealthProfiles
                        SET HeightCm = @HeightCm,
                            WeightKg = @WeightKg,
                            TargetWeightKg = @TargetWeightKg,
                            ActivityLevel = @ActivityLevel,
                            DietPreference = @DietPreference,
                            UpdatedAt = GETDATE()
                        WHERE UserId = @UserId
                    `);
            } else {
                await pool.request()
                    .input('UserId', sql.Int, req.user?.id)
                    .input('HeightCm', sql.Decimal(5, 2), HeightCm)
                    .input('WeightKg', sql.Decimal(5, 2), WeightKg)
                    .input('TargetWeightKg', sql.Decimal(5, 2), TargetWeightKg)
                    .input('ActivityLevel', sql.NVarChar(50), ActivityLevel)
                    .input('DietPreference', sql.NVarChar(50), DietPreference)
                    .query(`
                        INSERT INTO HealthProfiles (UserId, HeightCm, WeightKg, TargetWeightKg, ActivityLevel, DietPreference)
                        VALUES (@UserId, @HeightCm, @WeightKg, @TargetWeightKg, @ActivityLevel, @DietPreference)
                    `);
            }

            res.json({ message: 'Health profile updated successfully' });
        } catch (error) {
            console.error('Update Health Profile Error:', error);
            res.status(500).json({ message: 'Failed to update health profile' });
        }
    }

    async getFreeTrialStatus(req: any, res: Response) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('UserId', sql.Int, req.user?.id)
                .query(`
                    SELECT 
                        HasFreeTrialUsed,
                        FreeTrialEndDate,
                        DATEDIFF(day, GETDATE(), FreeTrialEndDate) as DaysRemaining
                    FROM Users
                    WHERE Id = @UserId
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const user = result.recordset[0];
            const isActive = user.FreeTrialEndDate && new Date(user.FreeTrialEndDate) > new Date();

            res.json({
                hasTrial: user.HasFreeTrialUsed,
                isActive: !!isActive,
                endDate: user.FreeTrialEndDate,
                daysRemaining: isActive ? user.DaysRemaining : 0
            });
        } catch (error) {
            console.error('Get Trial Status Error:', error);
            res.status(500).json({ message: 'Failed to fetch trial status' });
        }
    }

    async startFreeTrial(req: any, res: Response) {
        try {
            const pool = await getPool();
            
            // Check if already used
            const checkResult = await pool.request()
                .input('UserId', sql.Int, req.user?.id)
                .query('SELECT HasFreeTrialUsed FROM Users WHERE Id = @UserId');

            if (checkResult.recordset[0]?.HasFreeTrialUsed) {
                return res.status(400).json({ message: 'Free trial already used' });
            }

            // Update user
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);

            await pool.request()
                .input('UserId', sql.Int, req.user?.id)
                .input('EndDate', sql.DateTime, endDate)
                .query(`
                    UPDATE Users 
                    SET HasFreeTrialUsed = 1,
                        FreeTrialEndDate = @EndDate
                    WHERE Id = @UserId
                `);

            res.json({ 
                message: 'Free trial started successfully',
                endDate
            });
        } catch (error) {
            console.error('Start Trial Error:', error);
            res.status(500).json({ message: 'Failed to start free trial' });
        }
    }
}