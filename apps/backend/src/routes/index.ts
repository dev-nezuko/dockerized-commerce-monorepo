import type { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { healthRouter } from './health';
import { metricsRouter } from '../metrics';
import { authRouter } from './auth';
import { productsRouter } from './products';
import { leadsRouter } from './leads';

export function registerRoutes(app: Application): void {
  app.use('/', healthRouter());
  app.use('/', metricsRouter());

  app.use(authRouter());
  app.use(productsRouter());
  app.use(leadsRouter());

  const openapiPath = path.join(__dirname, '../../openapi.yaml');
  const swaggerDoc = YAML.load(openapiPath);
  app.get('/openapi.json', (_req, res) => res.json(swaggerDoc));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerUrl: '/openapi.json' }));

  app.get('/api', (_req, res) => {
    res.json({ message: 'eco-bottle API' });
  });
}
