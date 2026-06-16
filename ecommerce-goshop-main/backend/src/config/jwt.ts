import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "gymfit-jwt-secret-dev";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "gymfit-refresh-secret-dev";

export interface TokenPayload {
  userId: number;
  email: string;
  roleId: number;
  roleName: string;
  jti?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  // Add unique jti to prevent UNIQUE constraint collision on identical payloads
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
