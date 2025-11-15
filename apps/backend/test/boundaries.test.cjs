const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadWithStubs, usingServer } = require('./helpers/stubs.cjs');

const existing = { id: '0b6f1c84-5d0e-4f43-9a52-3c1f3c2b9d10', slug: 'trail-bottle', name: 'Trail bottle' };
let repo;
beforeEach(() => {
  repo = {
    queries: 0,
    findAndCount: async () => { repo.queries++; return [[], 0]; },
    findOne: async ({ where }) => { repo.queries++; return where.id === existing.id ? { ...existing } : null; },
    existsBy: async ({ slug }) => slug === existing.slug,
    create: (body) => ({ id: 'new-id', ...body }),
    merge: (target, changes) => Object.assign(target, changes),
    save: async (entity) => entity,
    remove: async () => {},
  };
});

const express = require('express');
const { productsRouter } = loadWithStubs({
  '../data-source': { AppDataSource: { getRepository: () => new Proxy({}, { get: (_t, k) => repo[k] }) } },
  '../middleware/auth': { requireAuth: () => (_req, _res, next) => next() },
  '../services/cache': {
    withCache: async (_key, _ttl, factory) => ({ value: await factory(), hit: false }),
    invalidateBySet: async () => {},
    removeKey: async () => {},
  },
}, () => require('../src/routes/products'));
const { errorHandler } = require('../src/middleware/error');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use(productsRouter());
  instance.use(errorHandler);
  return instance;
}

const send = (base, method, path, body) =>
  fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });

test('product writes default to disabled even when authentication middleware succeeds', async () => {
  delete process.env.ENABLE_DEMO_PRODUCT_WRITES;
  await usingServer(app(), async (base) => {
    for (const [method, path] of [['POST', '/api/products'], ['PUT', '/api/products/any'], ['DELETE', '/api/products/any']]) {
      assert.equal((await send(base, method, path)).status, 403);
    }
  });
});

test('invalid page values are rejected before catalog queries', async () => {
  await usingServer(app(), async (base) => {
    for (const query of ['page=-1', 'page=0', 'page=1.5', 'page=100001', 'page=NaN', 'limit=NaN', 'limit=0']) {
      assert.equal((await fetch(`${base}/api/products?${query}`)).status, 400, query);
    }
    assert.equal(repo.queries, 0);
    const ok = await fetch(`${base}/api/products?page=2&limit=500`);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { items: [], total: 0, page: 2, limit: 100 });
    assert.equal(repo.queries, 1);
  });
});

test('unexpected errors do not return database details', async () => {
  const instance = express();
  instance.get('/', () => { throw new Error('private database connection details'); });
  instance.use(errorHandler);
  await usingServer(instance, async (base) => {
    const response = await fetch(base);
    assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await response.json()).includes('private database'), false);
  });
});

test('demo writes: non-UUID ids are 404 without a database query', async () => {
  process.env.ENABLE_DEMO_PRODUCT_WRITES = 'true';
  await usingServer(app(), async (base) => {
    assert.equal((await send(base, 'PUT', '/api/products/not-a-uuid', { name: 'x' })).status, 404);
    assert.equal((await send(base, 'DELETE', '/api/products/not-a-uuid')).status, 404);
    assert.equal(repo.queries, 0);
    const renamed = await send(base, 'PUT', `/api/products/${existing.id}`, { name: 'Trail bottle v2' });
    assert.equal(renamed.status, 200);
    assert.equal((await renamed.json()).name, 'Trail bottle v2');
  });
});

test('demo writes: duplicate slugs are a 409 conflict', async () => {
  process.env.ENABLE_DEMO_PRODUCT_WRITES = 'true';
  const product = { slug: 'trail-bottle', name: 'Copy', priceCents: 1000, imageUrl: '/bottle.svg', shortDescription: 'Copy' };
  await usingServer(app(), async (base) => {
    const response = await send(base, 'POST', '/api/products', product);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'ConflictError');
  });
});

test('demo writes accept the image shapes the frontend can render', async () => {
  process.env.ENABLE_DEMO_PRODUCT_WRITES = 'true';
  const base = { name: 'Flask', priceCents: 1000, shortDescription: 'A flask' };
  await usingServer(app(), async (url) => {
    const accepted = ['/bottle-placeholder.svg', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'catalog/flask-01'];
    for (const [i, imageUrl] of accepted.entries()) {
      assert.equal((await send(url, 'POST', '/api/products', { ...base, slug: `flask-${i}`, imageUrl })).status, 201, imageUrl);
    }
    for (const imageUrl of ['javascript:alert(1)', '//evil.example/x.png', '../secret']) {
      assert.equal((await send(url, 'POST', '/api/products', { ...base, slug: 'flask-bad', imageUrl })).status, 400, imageUrl);
    }
    assert.equal((await send(url, 'POST', '/api/products', { ...base, slug: 'Not A Slug', imageUrl: '/x.svg' })).status, 400);
  });
});
