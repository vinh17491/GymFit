import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { IJwtPayload, UserRole } from '../types';
import { sendError } from '../utils/response';

interface AccessClaims extends jwt.JwtPayload { userId: number; sessionId: number; tokenVersion: number }

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return sendError(res, 'Authentication required', 401);
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'], issuer: config.jwt.issuer, audience: config.jwt.audience,
    }) as AccessClaims;
    if (!Number.isSafeInteger(decoded.userId) || !Number.isSafeInteger(decoded.sessionId) || !Number.isSafeInteger(decoded.tokenVersion)) {
      return sendError(res, 'Invalid or expired token', 401);
    }
    const { query } = await import('../config/database');
    const current = await query<{ id:number; email:string; role:UserRole; token_version:number }>(
      `SELECT u.id,u.email,u.role,u.token_version FROM dbo.Users u
       JOIN dbo.AuthSessions s ON s.id=@sessionId AND s.user_id=u.id
       WHERE u.id=@userId AND u.is_active=1 AND u.token_version=@tokenVersion
         AND (u.role<>N'coach' OR COALESCE(u.coach_status,N'ACTIVE')=N'ACTIVE')
         AND s.revoked_at IS NULL AND s.expires_at>SYSUTCDATETIME()`,
      { userId: decoded.userId, sessionId: decoded.sessionId, tokenVersion: decoded.tokenVersion },
    );
    const user = current.recordset[0];
    if (!user) return sendError(res, 'Invalid or expired token', 401);
    req.user = { userId:user.id, email:user.email, role:user.role, tokenVersion:user.token_version, sessionId:decoded.sessionId } as IJwtPayload;
    next();
  } catch { return sendError(res, 'Invalid or expired token', 401); }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Authentication required', 401);
    if (roles.length > 0 && !roles.includes(req.user.role as UserRole)) return sendError(res, 'Forbidden', 403);
    next();
  };
}
