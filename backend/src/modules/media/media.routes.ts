import { Router } from 'express';
import { retiredMediaEndpoint } from './media.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

router.get('/status', retiredMediaEndpoint);
router.post('/process/:productId', authenticate, authorize(UserRole.ADMIN), validate(z.object({productId:z.coerce.number().int().positive()}),'params'), retiredMediaEndpoint);
router.post('/batch-process', authenticate, authorize(UserRole.ADMIN), retiredMediaEndpoint);

export default router;
