import type { NextFunction, Request, Response } from 'express';
import { AuthError } from './error';
import { isBlacklisted, verify } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  tokenInfo?: { exp: number; jti: string };
}

export function requireAuth() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) throw new AuthError('Missing token');
      const token = header.slice('Bearer '.length);
      const info = verify(token);
      const blacklisted = await isBlacklisted(info.jti);
      if (blacklisted) throw new AuthError('Token revoked');
      req.user = { userId: info.userId, email: info.email };
      req.tokenInfo = { exp: info.exp, jti: info.jti };
      next();
    } catch (err) {
      next(err);
    }
  };
}
