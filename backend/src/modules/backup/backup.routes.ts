import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { createBackup, listBackups, restoreBackup } from './backup.controller';
const router = Router();
router.post('/create', authenticate, authorize(UserRole.ADMIN), createBackup);
router.get('/', authenticate, authorize(UserRole.ADMIN), listBackups);
router.post('/:id/restore', authenticate, authorize(UserRole.ADMIN), restoreBackup);
export default router;
