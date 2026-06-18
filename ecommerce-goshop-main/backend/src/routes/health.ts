import { Router } from 'express';
import { HealthController } from '../controllers/health';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireBody, validatePositiveNumber, sanitizeBody } from '../middleware/validate';

const router = Router();
const healthController = new HealthController();

// Guest friendly routes with validation
router.post('/bmi-calculate', sanitizeBody, requireBody('weight', 'height'), validatePositiveNumber('weight'), validatePositiveNumber('height'), healthController.calculateBMI.bind(healthController));
router.post('/bodyfat-calculate', sanitizeBody, requireBody('weight', 'height', 'age', 'gender'), validatePositiveNumber('weight'), validatePositiveNumber('height'), validatePositiveNumber('age'), healthController.calculateBodyFat.bind(healthController));

// Protected routes
router.use(authMiddleware);
router.get('/profile', healthController.getHealthProfile.bind(healthController));
router.post('/profile', sanitizeBody, healthController.updateHealthProfile.bind(healthController));
router.get('/trial', healthController.getFreeTrialStatus.bind(healthController));
router.post('/trial/start', healthController.startFreeTrial.bind(healthController));

export default router;