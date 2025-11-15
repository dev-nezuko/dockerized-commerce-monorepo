import 'reflect-metadata';
import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { httpLogger } from './logger';
import { observeRequestDuration } from './metrics';
import { errorHandler, NotFoundError } from './middleware/error';
import { rateLimitRedis } from './middleware/ratelimit';
import { requestTimeout } from './middleware/timeout';
import { registerRoutes } from './routes';

export function buildExpressApp(): Application {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? (process.env.FRONTEND_ORIGIN || false) : true,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(httpLogger);
  app.use(requestTimeout(2000));
  app.use((req, res, next) => {
    if (req.id !== undefined) res.setHeader('x-request-id', String(req.id));
    next();
  });
  app.use(observeRequestDuration);

  // Health checks and scrapes stay outside the limiter so probes cannot exhaust it.
  app.use('/api', rateLimitRedis({ name: 'api', windowSec: 60, max: 300 }));

  registerRoutes(app);

  app.use(() => {
    throw new NotFoundError();
  });
  app.use(errorHandler);

  return app;
}
