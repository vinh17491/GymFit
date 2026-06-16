import { NextFunction, Request, Response } from "express";

type AuthRequest = Request & { roleName?: string };

export const verifyRolesMiddleware = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.roleName) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (roles.includes(authReq.roleName)) {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
};
