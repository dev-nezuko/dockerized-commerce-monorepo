import express from 'express';
import { z } from 'zod';

import { AppDataSource } from '../data-source';
import { Lead } from '../entities/Lead';
import { rateLimitRedis } from '../middleware/ratelimit';
import { validate } from '../middleware/validate';

const leadSchema = z.object({
  email: z.email().max(254).trim().toLowerCase(),
  name: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  utmSource: z.string().trim().max(120).optional(),
});

export function leadsRouter(): express.Router {
  const router = express.Router();
  const repo = AppDataSource.getRepository(Lead);

  // Every enquiry is stored, including repeat enquiries from the same address.
  router.post('/api/leads', rateLimitRedis({ name: 'leads', windowSec: 60, max: 5 }), validate(leadSchema), async (req, res) => {
    const lead = await repo.save(repo.create(req.body as z.infer<typeof leadSchema>));
    res.status(201).json({ id: lead.id, createdAt: lead.createdAt });
  });

  return router;
}
