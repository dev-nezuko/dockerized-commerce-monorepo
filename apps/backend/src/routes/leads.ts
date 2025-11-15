import express from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Lead } from '../entities/Lead';
import { validate } from '../middleware/validate';
import { rateLimitRedis } from '../middleware/ratelimit';

const leadSchema = z.object({
  email: z.email().max(254),
  name: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
  utmSource: z.string().max(200).optional(),
});

export function leadsRouter(): express.Router {
  const router = express.Router();
  const repo = AppDataSource.getRepository(Lead);

  router.post(
    '/api/leads',
    rateLimitRedis({ windowSec: 60, max: 5 }),
    validate(leadSchema),
    async (req, res, next) => {
      try {
        const exists = await repo.findOne({ where: { email: req.body.email } });
        if (exists) return res.status(200).json({ id: exists.id });
        const lead = await repo.save(repo.create(req.body));
        res.status(201).json(lead);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
