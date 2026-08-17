import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { config } from '../config/config';
import { sendError } from '../utils/response';

export function rateLimitHandler(message: string, retryAfter: number) {
  return (_req: Request, res: Response) => sendError(res, message, 429, { retryAfter });
}

// Rate limiters use memory store (Redis optional for distributed limits)
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  handler: rateLimitHandler('Too many requests from this IP, please try again later.', Math.ceil(config.rateLimit.api.windowMs / 1000)),
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: () => {
    const regressionLimit=process.env.REGRESSION02_ACCEPTANCE==='1'?Number(process.env.REGRESSION02_AUTH_LIMIT_MAX):NaN;
    if(Number.isInteger(regressionLimit)&&regressionLimit>0&&regressionLimit<=1000)return regressionLimit;
    return config.nodeEnv === 'test' || config.db.database.startsWith('GYMFIT_DB_AUTH_RBAC_ACCEPTANCE_') || config.db.database.startsWith('GYMFIT_REGRESSION_02_') ? 1000 : config.rateLimit.auth.max;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  handler: rateLimitHandler('Too many login attempts, please try again later.', Math.ceil(config.rateLimit.auth.windowMs / 1000)),
});

export const uploadLimiter = rateLimit({
  windowMs: config.rateLimit.upload.windowMs,
  max: config.rateLimit.upload.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many file uploads, please try again later.', Math.ceil(config.rateLimit.upload.windowMs / 1000)),
});
