import { Request, Response, NextFunction } from 'express';

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction) {
  // This middleware is defense-in-depth normalization only. It is not the
  // application's primary XSS control; route schemas, parameterized queries,
  // React escaping, CSP and context-specific URL/file validation remain the
  // actual boundaries.
  const opaqueFields = new Set([
    'password', 'current_password', 'new_password',
    'refreshToken', 'refresh_token', 'accessToken', 'access_token',
    'token', 'csrfToken', 'csrf_token', 'apiKey', 'api_key', 'secret', 'cookie',
  ].map(value => value.toLowerCase()));
  const isOpaqueField = (key: string) => opaqueFields.has(key.toLowerCase());
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
        result[key] = isOpaqueField(key) ? value : sanitize(value);
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
