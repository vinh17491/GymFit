import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/** Extends Express Request to carry a unique requestId */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Assigns a unique ID to each incoming request.
 * Uses X-Request-ID header if present, otherwise generates a new UUID.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = (req.headers["x-request-id"] as string) || randomUUID();
  req.startTime = Date.now();
  next();
}