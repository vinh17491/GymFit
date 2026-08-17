import express, { type Request } from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/config';
import { query } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeMiddleware } from './middleware/sanitize';
import { createAuditMiddleware } from './middleware/auditLogger';
import { securityHeaders } from './middleware/securityHeaders';
import { registerRoutes } from './routes/registerRoutes';
import { redactLogText } from './utils/logRedaction';
import path from 'path';

const app = express();
app.set('trust proxy', config.trustProxy);

// Security middleware stack
app.use(securityHeaders);
const allowedOrigins=config.cors.allowedOrigins;
app.use(cors({ origin:(origin,callback)=>!origin||allowedOrigins.includes(origin)?callback(null,true):callback(new Error('Origin not allowed')), credentials:true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);
app.use(createAuditMiddleware());
app.use(apiLimiter);
if (config.nodeEnv === 'development') {
  morgan.token('safe-url', req => redactLogText((req as Request).originalUrl));
  app.use(morgan(':method :safe-url :status :response-time ms'));
}

app.use('/uploads', express.static(path.resolve(config.upload.dir), { fallthrough: true, index: false, dotfiles: 'deny' }));
app.use('/image', express.static(path.resolve(__dirname, '../../image'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
  }
}));
app.use('/media', express.static('public/media', {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.svg') || filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', filePath.endsWith('.svg') ? 'image/svg+xml' : 'image/webp');
    }
  }
}));

const databaseReady = async (): Promise<boolean> => {
  try { await query('SELECT 1 AS ok'); return true; } catch { return false; }
};
app.get('/api/health', async (_req, res) => {
  if (!await databaseReady()) return res.status(503).json({ success: false, status: 'not_ready', message: 'GymFit API not ready', dependency: 'database', timestamp: new Date().toISOString() });
  return res.json({ success: true, message: 'GymFit API running', status: 'ready', timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req, res) => res.status(200).json({ success: true, status: 'live', timestamp: new Date().toISOString() }));
app.get('/health/ready', async (_req, res) => {
  if (!await databaseReady()) return res.status(503).json({ success: false, status: 'not_ready', dependency: 'database', timestamp: new Date().toISOString() });
  return res.status(200).json({ success: true, status: 'ready', timestamp: new Date().toISOString() });
});

// Existing route set plus the PHASE 72 Assistant API.
registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
