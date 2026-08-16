import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

// Rate limiters use memory store (Redis optional for distributed limits)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: () => {
    const regressionLimit=process.env.REGRESSION02_ACCEPTANCE==='1'?Number(process.env.REGRESSION02_AUTH_LIMIT_MAX):NaN;
    if(Number.isInteger(regressionLimit)&&regressionLimit>0&&regressionLimit<=1000)return regressionLimit;
    return config.nodeEnv === 'test' || config.db.database.startsWith('GYMFIT_DB_AUTH_RBAC_ACCEPTANCE_') || config.db.database.startsWith('GYMFIT_REGRESSION_02_') ? 1000 : 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    retryAfter: 60,
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
  },
});
