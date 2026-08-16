import session from 'express-session';
import { config } from '../config/config';

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'gymer-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
  name: '__Secure-gymer-session',
  rolling: true,
});
