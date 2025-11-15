import express from 'express';
import { collectDefaultMetrics, Histogram, register } from 'prom-client';

collectDefaultMetrics();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export function metricsRouter(): express.Router {
  const router = express.Router();

  router.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end((err as Error).message);
    }
  });

  return router;
}
