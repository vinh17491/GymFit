import { Request, Response, NextFunction } from 'express';

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction) {
  // Secrets are opaque values. Trimming or stripping characters can invalidate
  // credentials/tokens and must never be part of generic input sanitisation.
  const opaqueFields = new Set(['password', 'current_password', 'new_password', 'refreshToken', 'accessToken']);
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+\s*=/gi, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = opaqueFields.has(key) ? value : sanitize(value);
      }
      return result;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query) as Request['query'];
  if (req.params) req.params = sanitize(req.params) as Request['params'];
  next();
}
