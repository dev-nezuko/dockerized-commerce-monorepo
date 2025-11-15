import express from 'express';
import { z } from 'zod';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { login, logout, register } from '../services/authService';

const credentialsSchema = z.object({
  email: z.email().max(254).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});
type Credentials = z.infer<typeof credentialsSchema>;

export function authRouter(): express.Router {
  const router = express.Router();

  router.post('/api/auth/register', validate(credentialsSchema), async (req, res) => {
    const { email, password } = req.body as Credentials;
    const user = await register(email, password);
    res.status(201).json({ id: user.id, email: user.email });
  });

  router.post('/api/auth/login', validate(credentialsSchema), async (req, res) => {
    const { email, password } = req.body as Credentials;
    const { token } = await login(email, password);
    res.json({ token });
  });

  router.post('/api/auth/logout', requireAuth(), async (req: AuthenticatedRequest, res) => {
    const { jti, exp } = req.tokenInfo!;
    const remaining = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await logout(jti, remaining);
    res.status(204).end();
  });

  router.get('/api/auth/me', requireAuth(), (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  return router;
}
