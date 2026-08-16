import rateLimit from 'express-rate-limit';
const max=Number(process.env.BRAND_REQUEST_RATE_LIMIT_MAX||10);
const windowMs=Number(process.env.BRAND_REQUEST_RATE_LIMIT_WINDOW_MS||86_400_000);
export const brandRequestCreateLimiter=rateLimit({windowMs,max,standardHeaders:true,legacyHeaders:false,
  keyGenerator:req=>`${req.user?.userId??'anonymous'}:${req.ip}`,message:{success:false,message:'Brand request rate limit exceeded'}});
