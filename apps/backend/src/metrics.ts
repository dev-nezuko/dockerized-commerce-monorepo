import express from 'express';
import { collectDefaultMetrics, Histogram, register } from 'prom-client';

collectDefaultMetrics();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

/**
 * Labels by matched route pattern (`/api/products/:slug`), not the raw path,
 * so every slug or probed URL does not create a new time series.
 */
export const observeRequestDuration: express.RequestHandler = (req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method });
  res.on('finish', () => {
    const pattern = req.route?.path;
    const route = typeof pattern === 'string' ? req.baseUrl + pattern : 'unmatched';
    end({ route, status_code: String(res.statusCode) });
  });
  next();
};

export function metricsRouter(): express.Router {
  const router = express.Router();
  router.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  return router;
}
