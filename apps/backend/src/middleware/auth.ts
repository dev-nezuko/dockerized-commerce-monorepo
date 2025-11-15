import type { NextFunction, Request, Response } from 'express';

import { isBlacklisted, verify } from '../services/authService';
import { AuthError } from './error';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  tokenInfo?: { exp: number; jti: string };
}

export function requireAuth() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new AuthError('Missing token');
    const info = verify(header.slice('Bearer '.length));
    // Fails closed: if Redis cannot answer, the request errors rather than
    // accepting a token that may have been revoked.
    if (await isBlacklisted(info.jti)) throw new AuthError('Token revoked');
    req.user = { userId: info.userId, email: info.email };
    req.tokenInfo = { exp: info.exp, jti: info.jti };
    next();
  };
}
