import express from 'express';

import { redis } from '../config/redis';
import { AppDataSource } from '../data-source';

export function healthRouter(): express.Router {
  const router = express.Router();

  // Liveness: the process is up and serving HTTP.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), commitSha: process.env.COMMIT_SHA });
  });

  // Readiness: the dependencies a request needs are reachable.
  router.get('/ready', async (_req, res) => {
    const [database, cache] = await Promise.all([
      AppDataSource.query('SELECT 1').then(() => 'ok', () => 'unavailable'),
      redis.ping().then(() => 'ok', () => 'unavailable'),
    ]);
    const ready = database === 'ok' && cache === 'ok';
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', database, cache });
  });

  return router;
}
