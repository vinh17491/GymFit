import { Request, Response, NextFunction } from "express";

// Standardized API error response
export function sendError(res: Response, status: number, message: string, field?: string) {
    return res.status(status).json({ error: message, field: field || null });
}

// Validate required body fields
export function requireBody(...fields: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === "");
        if (missing.length > 0) {
            return sendError(res, 400, `Missing required fields: ${missing.join(", ")}`);
        }
        next();
    };
}

// Validate UUID param
export function validateIdParam(paramName: string = "id") {
    return (req: Request, res: Response, next: NextFunction) => {
        const val = req.params[paramName];
        if (!val || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
            return sendError(res, 400, `Invalid ${paramName}`, paramName);
        }
        next();
    };
}

// Validate pagination query params
export function validatePagination(req: Request, res: Response, next: NextFunction) {
    const { page, limit } = req.query;
    if (page !== undefined) {
        const p = Number(page);
        if (isNaN(p) || p < 1) return sendError(res, 400, "Invalid page parameter", "page");
        (req as any).validatedPage = Math.floor(p);
    }
    if (limit !== undefined) {
        const l = Number(limit);
        if (isNaN(l) || l < 1 || l > 100) return sendError(res, 400, "Invalid limit (1-100)", "limit");
        (req as any).validatedLimit = Math.floor(l);
    }
    next();
}

// Validate email format
export function validateEmail(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;
    if (email !== undefined) {
        if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return sendError(res, 400, "Invalid email format", "email");
        }
    }
    next();
}

// Validate role
export function validateRole(req: Request, res: Response, next: NextFunction) {
    const { role } = req.body;
    if (role !== undefined) {
        const validRoles = ["user", "coach", "admin", "member"];
        if (!validRoles.includes(role)) {
            return sendError(res, 400, `Invalid role. Must be one of: ${validRoles.join(", ")}`, "role");
        }
    }
    next();
}

// Validate positive number
export function validatePositiveNumber(fieldName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const val = req.body[fieldName];
        if (val !== undefined) {
            const num = Number(val);
            if (isNaN(num) || num < 0) {
                return sendError(res, 400, `${fieldName} must be a non-negative number`, fieldName);
            }
        }
        next();
    };
}

// Validate date string
export function validateDate(fieldName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const val = req.body[fieldName] || req.query[fieldName];
        if (val !== undefined && val !== null && val !== "") {
            const d = new Date(val as string);
            if (isNaN(d.getTime())) {
                return sendError(res, 400, `Invalid date format for ${fieldName}`, fieldName);
            }
        }
        next();
    };
}

// Sanitize string: trim whitespace
export function sanitizeString(str: any): string {
    if (typeof str !== "string") return str;
    return str.trim();
}

// Sanitize body strings
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === "object") {
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === "string") {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    next();
}

// Combined: sanitize + pagination for common GET endpoints
export function commonGetValidation(req: Request, res: Response, next: NextFunction) {
    sanitizeBody(req, res, () => {
        validatePagination(req, res, next);
    });
}