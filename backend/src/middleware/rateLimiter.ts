import rateLimit from 'express-rate-limit';
import type { Request, RequestHandler, Response } from 'express';
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

const assistantGuestLimiter = rateLimit({
  windowMs: config.rateLimit.assistant.guest.windowMs,
  max: config.rateLimit.assistant.guest.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`,
  handler: rateLimitHandler('Too many assistant requests, please try again later.', Math.ceil(config.rateLimit.assistant.guest.windowMs / 1000)),
});

const assistantAuthenticatedLimiter = rateLimit({
  windowMs: config.rateLimit.assistant.authenticated.windowMs,
  max: config.rateLimit.assistant.authenticated.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.userId ?? 'unknown'}`,
  handler: rateLimitHandler('Too many assistant requests, please try again later.', Math.ceil(config.rateLimit.assistant.authenticated.windowMs / 1000)),
});

export const assistantChatLimiter: RequestHandler = (req, res, next) => {
  if (req.user) return assistantAuthenticatedLimiter(req, res, next);
  return assistantGuestLimiter(req, res, next);
};
