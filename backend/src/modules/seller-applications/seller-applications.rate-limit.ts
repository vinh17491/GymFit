import rateLimit from 'express-rate-limit';

function mutationLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => `${req.user?.userId ?? 'anonymous'}:${req.ip ?? 'unknown'}`,
    message: { success: false, message },
  });
}

const positive=(name:string,fallback:number)=>{
  const value=Number(process.env[name]);
  return Number.isSafeInteger(value)&&value>0?value:fallback;
};

export const sellerApplicationWriteLimiter = mutationLimiter(
  positive('SELLER_APPLICATION_WRITE_RATE_LIMIT_WINDOW_MS',15*60*1000),
  positive('SELLER_APPLICATION_WRITE_RATE_LIMIT_MAX',30),
  'Too many seller application changes. Please try again later.',
);
export const sellerApplicationSubmitLimiter = mutationLimiter(
  positive('SELLER_APPLICATION_SUBMIT_RATE_LIMIT_WINDOW_MS',24*60*60*1000),
  positive('SELLER_APPLICATION_SUBMIT_RATE_LIMIT_MAX',5),
  'Seller application submit limit reached. Please try again later.',
);
export const sellerApplicationWithdrawLimiter = mutationLimiter(
  positive('SELLER_APPLICATION_WITHDRAW_RATE_LIMIT_WINDOW_MS',24*60*60*1000),
  positive('SELLER_APPLICATION_WITHDRAW_RATE_LIMIT_MAX',10),
  'Seller application withdraw limit reached. Please try again later.',
);
