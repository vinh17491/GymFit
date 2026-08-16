import { Router } from 'express';
import { getCoaches, getCoachAvailability, getCoachById } from './coach.controller';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const coachId = z.object({ id: z.coerce.number().int().positive() }).strict();
const availabilityQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict();

// Public - List all coaches
router.get('/', getCoaches);

// Public - Get real availability for an active Coach
router.get('/:id/availability', validate(coachId, 'params'), validate(availabilityQuery, 'query'), getCoachAvailability);

// Public - Get coach by ID
router.get('/:id', validate(coachId, 'params'), getCoachById);

export default router;
