import { Router } from 'express';
import { processProductMedia, batchProcessMedia, getMediaStatus } from './media.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

router.get('/status', getMediaStatus);
router.post('/process/:productId', authenticate, authorize(UserRole.ADMIN), validate(z.object({productId:z.coerce.number().int().positive()}),'params'), processProductMedia);
router.post('/batch-process', authenticate, authorize(UserRole.ADMIN), batchProcessMedia);

export default router;
