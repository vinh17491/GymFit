import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { sendError } from '../utils/response';

export function validateCookieAuthOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (!origin || !config.cors.allowedOrigins.includes(origin)) return sendError(res, 'Origin not allowed', 403);
  next();
}
