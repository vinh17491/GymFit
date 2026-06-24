import { Router } from 'express';
import { LogbookController } from '../controllers/logbook';
import { authMiddleware } from '../middleware/authMiddleware';
import { sanitizeBody, commonGetValidation } from '../middleware/validate';

const router = Router();
const logbookController = new LogbookController();

router.use(authMiddleware);

router.post('/workout', sanitizeBody, logbookController.logWorkout);
router.post('/nutrition', sanitizeBody, logbookController.logNutrition);
router.get('/', commonGetValidation, logbookController.getMemberLogs);
router.get('/member-logs', commonGetValidation, logbookController.getMemberLogs);

export default router;