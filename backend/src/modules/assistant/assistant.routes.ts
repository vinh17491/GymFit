import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { chat } from './assistant.controller';
import { getStatus } from './assistant.controller';

const router = Router();

const chatInput = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(1200),
  }).strict()).max(12).optional(),
}).strict();

function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) return next();
  authenticate(req, res, next);
}

router.get('/status', getStatus);
router.post('/chat', optionalAuthenticate, validate(chatInput), chat);

export default router;
