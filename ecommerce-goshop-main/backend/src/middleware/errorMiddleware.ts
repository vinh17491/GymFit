import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
    const actualError = error?.error || error;
    console.error("❌ Full error details:", actualError);
    
    // Log the error message and stack trace
    if (actualError instanceof Error) {
        console.error("   Error message:", actualError.message);
        console.error("   Stack:", actualError.stack);
    }

    return res.status(500).json({ 
        message: error.message || "Internal server error",
        details: process.env.NODE_ENV !== 'production' ? 
            (actualError instanceof Error ? actualError.message : String(actualError)) : 
            undefined
    });
};
