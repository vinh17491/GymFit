import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try { req[source] = schema.parse(req[source]); next(); }
    catch (err) {
      if (err instanceof ZodError) {
        return sendError(res, 'Validation error', 400, err.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      }
      next(err);
    }
  };
}
