import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { approveAdmin, detailAdmin, listAdmin, rejectAdmin } from './seller-applications.controller';
import {
  adminSellerApplicationListSchema,
  applicationIdParamSchema,
  rejectSellerApplicationSchema,
} from './seller-applications.validation';

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/', validate(adminSellerApplicationListSchema, 'query'), listAdmin);
router.get('/:applicationId', validate(applicationIdParamSchema, 'params'), detailAdmin);
router.post('/:applicationId/approve', validate(applicationIdParamSchema, 'params'), approveAdmin);
router.post('/:applicationId/reject', validate(applicationIdParamSchema, 'params'), validate(rejectSellerApplicationSchema), rejectAdmin);

export default router;

