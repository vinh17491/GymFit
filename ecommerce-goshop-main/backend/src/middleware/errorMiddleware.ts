import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
    const actualError = error?.error || error;
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === "production";

    // Log error (never expose to client)
    console.error(`[${timestamp}] ${req.method} ${req.originalUrl} Error:`, {
        message: actualError?.message || error?.message,
        name: actualError?.name,
        userId: (req as any).userId,
        ip: req.ip,
    });

    // Always return generic error to client in production
    return res.status(500).json({
        success: false,
        message: isProduction
            ? "Internal server error"
            : (actualError instanceof Error ? actualError.message : error?.message) || "Internal server error",
    });
};
