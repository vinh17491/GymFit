import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) { super(message); this.name = 'AppError'; }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return sendError(res, err.message, err.statusCode, err.code ? { code: err.code } : undefined);
  if ([2601,2627].includes((err as Error & {number?:number}).number||0)) return sendError(res,'Resource conflict',409);
  const diagnostic=err as Error & {number?:number;code?:string};
  logger.error('Unhandled request error', { method:req.method, path:req.path, error:err.name, number:diagnostic.number, code:diagnostic.code });
  return sendError(res, 'Internal Server Error', 500);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `${req.method} ${req.path} not found`));
}
