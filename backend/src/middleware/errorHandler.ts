import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) { super(message); this.name = 'AppError'; }
}

type DiagnosticError = {
  name?: unknown;
  number?: unknown;
  code?: unknown;
  type?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

const safeClientStatuses = new Set([400, 401, 403, 404, 409, 422, 429]);

function diagnosticOf(error: unknown): DiagnosticError {
  return typeof error === 'object' && error !== null ? error as DiagnosticError : {};
}

function logRequestError(error: unknown, req: Request, message = 'Unhandled request error'): void {
  const diagnostic = diagnosticOf(error);
  logger.error(message, {
    method: req.method,
    path: req.path,
    error: typeof diagnostic.name === 'string' ? diagnostic.name : 'UnknownError',
    number: typeof diagnostic.number === 'number' ? diagnostic.number : undefined,
    code: typeof diagnostic.code === 'string' ? diagnostic.code : undefined,
    type: typeof diagnostic.type === 'string' ? diagnostic.type : undefined,
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    logRequestError(err, req, 'Request error after headers sent');
    return res.end();
  }

  if (err instanceof AppError) {
    const statusCode = safeClientStatuses.has(err.statusCode) ? err.statusCode : 500;
    if (statusCode === 500) {
      logRequestError(err, req, 'Internal application error');
      return sendError(res, 'Internal Server Error', 500);
    }
    return sendError(res, err.message, statusCode, err.code ? { code: err.code } : undefined);
  }

  const diagnostic = diagnosticOf(err);
  const number = typeof diagnostic.number === 'number' ? diagnostic.number : undefined;
  if (number !== undefined && [2601, 2627].includes(number)) return sendError(res, 'Resource conflict', 409);
  if (diagnostic.type === 'entity.parse.failed') return sendError(res, 'Invalid JSON payload', 400);
  if (diagnostic.type === 'entity.too.large') return sendError(res, 'Request body is too large', 413);
  if (diagnostic.name === 'MulterError' || (typeof diagnostic.code === 'string' && diagnostic.code.startsWith('LIMIT_'))) {
    return sendError(res, 'Invalid file upload', 400);
  }
  if (diagnostic.status === 429 || diagnostic.statusCode === 429) return sendError(res, 'Too many requests', 429);

  logRequestError(err, req);
  return sendError(res, 'Internal Server Error', 500);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Route not found'));
}
