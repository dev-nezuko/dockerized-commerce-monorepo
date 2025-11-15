import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { httpLogger } from './logger';
import { registerRoutes } from './routes';
import { errorHandler, NotFoundError } from './middleware/error';
import { httpRequestDuration } from './metrics';
import { rateLimitRedis } from './middleware/ratelimit';
import { requestTimeout } from './middleware/timeout';
import { env } from './config/env';

export function buildExpressApp(): Application {
  const app = express();

  app.set('trust proxy', false);

  app.use(helmet());
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? (process.env.FRONTEND_ORIGIN || false) : true,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use(httpLogger);

  // Per-request timeout (2s default)
  app.use(requestTimeout(2000));

  // Echo request id back to client
  app.use((req, res, next) => {
    if (req.id !== undefined) {
      res.setHeader('x-request-id', String(req.id));
    }
    next();
  });

  // Measure HTTP request duration
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, path: req.path });
    res.on('finish', () => {
      end({ status_code: String(res.statusCode) });
    });
    next();
  });

  // Global Redis-based rate limiting
  app.use(rateLimitRedis({ windowSec: 15 * 60, max: 100 }));

  registerRoutes(app);

  app.use(() => {
    throw new NotFoundError();
  });

  app.use(errorHandler);

  return app;
}
