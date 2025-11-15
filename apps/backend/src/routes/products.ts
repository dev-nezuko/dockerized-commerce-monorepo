import crypto from 'node:crypto';

import express from 'express';
import { z } from 'zod';

import { AppDataSource } from '../data-source';
import { Product } from '../entities/Product';
import { requireAuth } from '../middleware/auth';
import { ConflictError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { invalidateBySet, removeKey, withCache } from '../services/cache';

const LIST_KEYS = 'products:keys';

// The frontend accepts an absolute URL, a path under its public/ folder or a
// Cloudinary public id, so the API accepts the same three shapes.
const imageRef = z.union([
  z.url({ protocol: /^https?$/ }),
  z.string().regex(/^\/(?!\/)[\w./-]+$/, 'Use a path such as /bottle.svg'),
  z.string().regex(/^[\w-]+(\/[\w-]+)*$/, 'Use a Cloudinary public id'),
]);

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens').max(255),
  name: z.string().trim().min(1).max(200),
  priceCents: z.number().int().min(0),
  imageUrl: imageRef,
  shortDescription: z.string().trim().min(1).max(500),
});

const updateSchema = createSchema.partial();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).transform((n) => Math.min(n, 100)).default(20),
});

function sendCachedJson(req: express.Request, res: express.Response, body: unknown, cacheHit: boolean, dbMs?: number): void {
  const raw = JSON.stringify(body);
  const etag = 'W/"' + crypto.createHash('sha1').update(raw).digest('base64') + '"';
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  const timing = [`cache;desc="${cacheHit ? 'HIT' : 'MISS'}"`];
  if (dbMs !== undefined) timing.unshift(`db;dur=${dbMs}`);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.setHeader('Server-Timing', timing.join(', '));
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

  // Product ids are UUIDs; anything else cannot match and would only make
  // Postgres raise a cast error, so answer 404 before querying.
  const assertSlugFree = async (slug: string) => {
    if (await repo.existsBy({ slug })) throw new ConflictError('Slug already in use');
  };

  const findById = async (id: string) => (z.uuid().safeParse(id).success ? repo.findOne({ where: { id } }) : null);

  router.get('/api/products', async (req, res) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid pagination' });
      return;
    }
    const { page, limit } = parsed.data;
    const started = Date.now();
    const { value, hit } = await withCache(`products:list:v1:page=${page}:limit=${limit}`, 60, async () => {
      const [items, total] = await repo.findAndCount({
        order: { createdAt: 'DESC', slug: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { items, total, page, limit };
    }, LIST_KEYS);
    sendCachedJson(req, res, value, hit, hit ? undefined : Date.now() - started);
  });

  router.get('/api/products/:slug', async (req, res) => {
    const slug = String(req.params.slug);
    const started = Date.now();
    const { value, hit } = await withCache(`products:slug:${slug}`, 300, async () => {
      const item = await repo.findOne({ where: { slug } });
      return item ?? { __notFound: true as const };
    });
    if ('__notFound' in value) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    sendCachedJson(req, res, value, hit, hit ? undefined : Date.now() - started);
  });

  router.post('/api/products', demoWrites, requireAuth(), validate(createSchema), async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    await assertSlugFree(body.slug);
    const created = await repo.save(repo.create(body));
    await invalidateBySet(LIST_KEYS);
    await removeKey(`products:slug:${created.slug}`);
    res.status(201).json(created);
  });

  router.put('/api/products/:id', demoWrites, requireAuth(), validate(updateSchema), async (req, res) => {
    const existing = await findById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    const changes = req.body as z.infer<typeof updateSchema>;
    const oldSlug = existing.slug;
    if (changes.slug !== undefined && changes.slug !== oldSlug) await assertSlugFree(changes.slug);
    const saved = await repo.save(repo.merge(existing, changes));
    await invalidateBySet(LIST_KEYS);
    await removeKey(`products:slug:${oldSlug}`);
    if (oldSlug !== saved.slug) await removeKey(`products:slug:${saved.slug}`);
    res.json(saved);
  });

  router.delete('/api/products/:id', demoWrites, requireAuth(), async (req, res) => {
    const existing = await findById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    await repo.remove(existing);
    await invalidateBySet(LIST_KEYS);
    await removeKey(`products:slug:${existing.slug}`);
    res.status(204).end();
  });

  return router;
}
