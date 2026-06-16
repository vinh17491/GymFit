import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";

type AuthRequest = Request & { userId?: number; roleName?: string; roleId?: number };

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization is required" });
  }
  const accessToken = authHeader.split(" ")[1];
  if (!accessToken) {
    return res.status(401).json({ message: "Authorization is required" });
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    const authReq = req as AuthRequest;
    authReq.userId = decoded.userId;
    authReq.roleName = decoded.roleName;
    authReq.roleId = decoded.roleId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};
