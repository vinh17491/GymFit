import rateLimit from 'express-rate-limit';
import { config } from '../../config/config';
import { rateLimitHandler } from '../../middleware/rateLimiter';

function mutationLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => `${req.user?.userId ?? 'anonymous'}:${req.ip ?? 'unknown'}`,
    handler: rateLimitHandler(message, Math.ceil(windowMs / 1000)),
  });
}

export const sellerApplicationWriteLimiter = mutationLimiter(
  config.rateLimit.sellerApplication.write.windowMs,
  config.rateLimit.sellerApplication.write.max,
  'Too many seller application changes. Please try again later.',
);
export const sellerApplicationSubmitLimiter = mutationLimiter(
  config.rateLimit.sellerApplication.submit.windowMs,
  config.rateLimit.sellerApplication.submit.max,
  'Seller application submit limit reached. Please try again later.',
);
export const sellerApplicationWithdrawLimiter = mutationLimiter(
  config.rateLimit.sellerApplication.withdraw.windowMs,
  config.rateLimit.sellerApplication.withdraw.max,
  'Seller application withdraw limit reached. Please try again later.',
);
