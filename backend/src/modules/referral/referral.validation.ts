import { z } from 'zod';
export const createReferralCodeSchema = z.object({});
export const claimRewardSchema = z.object({ reward_id: z.number().int().positive() });
