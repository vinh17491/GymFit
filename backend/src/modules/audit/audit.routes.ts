import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { getLogs, getActions } from './audit.controller';

const router = Router();
router.get('/', authenticate, authorize(UserRole.ADMIN), getLogs);
router.get('/actions', authenticate, authorize(UserRole.ADMIN), getActions);
export default router;
