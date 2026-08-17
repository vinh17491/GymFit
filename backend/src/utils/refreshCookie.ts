import { Request, Response } from 'express';
import { config } from '../config/config';

function cookieParts(): string[] {
  return [
    `Path=${config.refreshCookie.path}`,
    `Max-Age=${Math.max(0, Math.floor(config.jwt.refreshLifetimeMs / 1000))}`,
    'HttpOnly',
    `SameSite=${config.refreshCookie.sameSite[0].toUpperCase()}${config.refreshCookie.sameSite.slice(1)}`,
    ...(config.refreshCookie.secure ? ['Secure'] : []),
  ];
}

function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim()) || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function readRefreshTokenCookie(req: Request): string | null {
  return parseCookieHeader(req.headers.cookie, config.refreshCookie.name);
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.setHeader('Set-Cookie', [`${config.refreshCookie.name}=${encodeURIComponent(token)}`, ...cookieParts()].join('; '));
}

export function clearRefreshTokenCookie(res: Response): void {
  const parts = cookieParts().filter(part => !part.startsWith('Max-Age='));
  res.setHeader('Set-Cookie', [`${config.refreshCookie.name}=`, 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT', ...parts].join('; '));
}
