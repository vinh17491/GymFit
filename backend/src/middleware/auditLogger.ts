// Simple audit logger without DailyRotateFile
import * as winston from 'winston';
import { Request, Response, NextFunction } from 'express';

const logDir = 'logs';

const auditTransport = new winston.transports.File({
  filename: `${logDir}/audit.log`,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const errorTransport = new winston.transports.File({
  filename: `${logDir}/error.log`,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const auditLogger = winston.createLogger({
  level: 'info',
  transports: [auditTransport],
});

const errorLogger = winston.createLogger({
  level: 'error',
  transports: [errorTransport],
});

export function logAudit(data: Record<string, unknown>) {
  auditLogger.info('AUDIT', data);
}

export function logError(data: Record<string, unknown>) {
  errorLogger.error('ERROR', data);
}

export function createAuditMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const ip = req.ip || '';
    const userAgent = req.get('User-Agent') || '';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        ip,
        userId: req.user?.userId,
        statusCode: res.statusCode,
        duration,
        userAgent,
        timestamp: new Date().toISOString(),
      };
      if (res.statusCode >= 400) {
        errorLogger.error('ERROR', logData);
      } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        auditLogger.info('AUDIT', logData);
      }
    });
    next();
  };
}
