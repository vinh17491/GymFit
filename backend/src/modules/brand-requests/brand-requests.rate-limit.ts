import rateLimit from 'express-rate-limit';
import { config } from '../../config/config';
import { rateLimitHandler } from '../../middleware/rateLimiter';
const { max, windowMs }=config.rateLimit.brandRequest;
export const brandRequestCreateLimiter=rateLimit({windowMs,max,standardHeaders:true,legacyHeaders:false,
  keyGenerator:req=>`${req.user?.userId??'anonymous'}:${req.ip}`,handler:rateLimitHandler('Brand request rate limit exceeded',Math.ceil(windowMs/1000))});
