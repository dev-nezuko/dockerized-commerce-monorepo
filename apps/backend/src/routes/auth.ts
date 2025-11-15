import express from 'express';
import { z } from 'zod';
import { register as svcRegister, login as svcLogin, logout as svcLogout, getTokenJti } from '../services/authService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export function authRouter(): express.Router {
  const router = express.Router();

  router.post('/api/auth/register', validate(registerSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body as z.infer<typeof registerSchema>;
      const user = await svcRegister(email, password);
      res.status(201).json({ id: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/auth/login', validate(loginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const { token } = await svcLogin(email, password);
      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/auth/logout', requireAuth(), async (req: AuthenticatedRequest, res, next) => {
    try {
      const header = req.headers.authorization as string;
      const token = header.slice('Bearer '.length);
      const jti = getTokenJti(token);
      if (!jti || !req.tokenInfo) {
        return res.status(400).json({ error: 'Invalid token' });
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const ttl = Math.max(1, req.tokenInfo.exp - nowSec);
      await svcLogout(jti, ttl);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/auth/me', requireAuth(), async (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  return router;
}
