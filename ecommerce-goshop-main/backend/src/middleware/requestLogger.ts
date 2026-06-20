import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

/**
 * Logs every incoming request and its response time.
 * Uses requestId set by requestIdMiddleware.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture the original end to log after response is sent
  const originalEnd = res.end.bind(res);
  res.end = function (this: Response, ...args: any[]) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (res.statusCode >= 500) {
      logger.error("Request completed", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("Request completed", logData);
    } else {
      logger.info("Request completed", logData);
    }

    return (originalEnd as any)(...args);
  } as any;

  next();
}