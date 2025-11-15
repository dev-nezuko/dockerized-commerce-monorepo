import express from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Product } from '../entities/Product';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import crypto from 'crypto';
import { withCache, invalidateBySet, removeKey } from '../services/cache';

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  imageUrl: z.url(),
  shortDescription: z.string().min(1),
});

const updateSchema = createSchema.partial();

function sendCachedJson(res: express.Response, body: unknown, cacheHit: boolean, dbMs?: number): void {
  const raw = JSON.stringify(body);
  const etag = 'W/"' + crypto.createHash('sha1').update(raw).digest('base64') + '"';
  const ifNoneMatch = res.req.headers['if-none-match'];
  if (ifNoneMatch && typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
    res.status(304).setHeader('ETag', etag).end();
    return;
  }
  const timingParts: string[] = [];
  if (typeof dbMs === 'number') timingParts.push(`db;dur=${dbMs}`);
  timingParts.push(`cache;desc="${cacheHit ? 'HIT' : 'MISS'}"`);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.setHeader('ETag', etag);
  res.setHeader('Server-Timing', timingParts.join(', '));
  res.type('application/json').send(raw);
}

export function productsRouter(): express.Router {
  const router = express.Router();
  const repo = AppDataSource.getRepository(Product);
  const demoWrites: express.RequestHandler = (_req, res, next) => {
    if (process.env.ENABLE_DEMO_PRODUCT_WRITES !== 'true') {
      res.status(403).json({ error: 'Product writes are disabled' });
      return;
    }
    next();
  };

  router.get('/api/products', async (req, res, next) => {
    try {
      const page = Number((req.query.page as string) ?? 1);
      const limit = Math.min(100, Math.max(1, Number((req.query.limit as string) ?? 20)));
      if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit)) {
        return res.status(400).json({ error: 'Invalid pagination' });
      }
      const key = `products:list:v1:page=${page}:limit=${limit}`;
      const tagSet = 'products:keys';
      const started = Date.now();
      const { value, hit } = await withCache(key, 60, async () => {
        const [items, total] = await repo.findAndCount({
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });
        return { items, total, page, limit };
      }, tagSet);
      const dbMs = Date.now() - started;
      sendCachedJson(res, value, hit, hit ? undefined : dbMs);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/products/:slug', async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const key = `products:slug:${slug}`;
      const started = Date.now();
      const { value, hit } = await withCache(key, 300, async () => {
        const item = await repo.findOne({ where: { slug } });
        return item ?? { __notFound: true as const };
      });
      if ('__notFound' in value) {
        return res.status(404).json({ error: 'Not Found' });
      }
      const dbMs = Date.now() - started;
      sendCachedJson(res, value, hit, hit ? undefined : dbMs);
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/products', demoWrites, requireAuth(), validate(createSchema), async (req, res, next) => {
    try {
      const entity = repo.create(req.body as Partial<Product>);
      const created: Product = await repo.save(entity);
      await invalidateBySet('products:keys');
      await removeKey(`products:slug:${created.slug}`);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.put('/api/products/:id', demoWrites, requireAuth(), validate(updateSchema), async (req, res, next) => {
    try {
      const existing = await repo.findOne({ where: { id: String(req.params.id) } });
      if (!existing) return res.status(404).json({ error: 'Not Found' });
      const oldSlug = existing.slug;
      repo.merge(existing, req.body as Partial<Product>);
      const saved: Product = await repo.save(existing);
      await invalidateBySet('products:keys');
      if (oldSlug !== saved.slug) await removeKey(`products:slug:${oldSlug}`);
      await removeKey(`products:slug:${saved.slug}`);
      res.json(saved);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/products/:id', demoWrites, requireAuth(), async (req, res, next) => {
    try {
      const existing = await repo.findOne({ where: { id: String(req.params.id) } });
      if (!existing) return res.status(404).json({ error: 'Not Found' });
      await repo.remove(existing);
      await invalidateBySet('products:keys');
      await removeKey(`products:slug:${existing.slug}`);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
