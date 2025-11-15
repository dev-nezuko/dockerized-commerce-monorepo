const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadWithStubs, fakeRedis, usingServer } = require('./helpers/stubs.cjs');

const redis = fakeRedis();
const express = require('express');
const { rateLimitRedis } = loadWithStubs({ '../config/redis': { redis } }, () => require('../src/middleware/ratelimit'));
const { withCache } = loadWithStubs({ '../config/redis': { redis } }, () => require('../src/services/cache'));
const { errorHandler, ConflictError } = require('../src/middleware/error');
const { requestTimeout } = require('../src/middleware/timeout');
const { observeRequestDuration } = require('../src/metrics');
const { register } = require('prom-client');

function limitedApp({ trustProxy = false } = {}) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use('/api', rateLimitRedis({ name: 'api', windowSec: 60, max: 3 }));
  app.post('/api/leads', rateLimitRedis({ name: 'leads', windowSec: 60, max: 1 }), (_req, res) => res.status(201).end());
  app.get('/api/products', (_req, res) => res.json([]));
  return app;
}

test('each limiter counts in its own bucket', async () => {
  redis.values.clear();
  await usingServer(limitedApp(), async (base) => {
    assert.equal((await fetch(`${base}/api/products`)).status, 200);
    assert.equal((await fetch(`${base}/api/products`)).status, 200);
    // Two catalog reads used the shared API budget but not the enquiry budget.
    const lead = await fetch(`${base}/api/leads`, { method: 'POST' });
    assert.equal(lead.status, 201);
    assert.equal(lead.headers.get('ratelimit-remaining'), '0');
    assert.equal((await fetch(`${base}/api/leads`, { method: 'POST' })).status, 429);
  });
});

test('a forged X-Forwarded-For does not reset the limit when no proxy is trusted', async () => {
  redis.values.clear();
  await usingServer(limitedApp(), async (base) => {
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await fetch(`${base}/api/products`, { headers: { 'x-forwarded-for': `203.0.113.${i}` } })).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  });
});

test('behind one trusted proxy, clients are counted separately', async () => {
  redis.values.clear();
  await usingServer(limitedApp({ trustProxy: 1 }), async (base) => {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${base}/api/products`, { headers: { 'x-forwarded-for': `203.0.113.${i}` } });
      assert.equal(response.status, 200);
    }
  });
});

test('the limiter lets requests through while Redis is down', async () => {
  redis.state.failing = true;
  try {
    await usingServer(limitedApp(), async (base) => {
      assert.equal((await fetch(`${base}/api/products`)).status, 200);
    });
  } finally {
    redis.state.failing = false;
  }
});

test('the cache reads through once when Redis is down', async () => {
  redis.state.failing = true;
  redis.state.calls = 0;
  let loads = 0;
  try {
    const result = await withCache('products:slug:x', 60, async () => ++loads);
    assert.deepEqual(result, { value: 1, hit: false });
    assert.equal(loads, 1);
    assert.equal(redis.state.calls, 1, 'stops calling Redis after the first failure');
  } finally {
    redis.state.failing = false;
  }
});

test('the cache serves a stored value on the second read', async () => {
  redis.values.clear();
  let loads = 0;
  const load = async () => ({ n: ++loads });
  assert.deepEqual(await withCache('k', 60, load, 'tags'), { value: { n: 1 }, hit: false });
  assert.deepEqual(await withCache('k', 60, load, 'tags'), { value: { n: 1 }, hit: true });
  assert.deepEqual([...redis.values.get('tags')], ['k']);
});

test('a handler that outlives the timeout gets a 503 and does not crash the process', async () => {
  const app = express();
  app.use(requestTimeout(30));
  app.get('/slow', async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    res.json({ late: true });
  });
  app.use(errorHandler);
  await usingServer(app, async (base) => {
    const response = await fetch(`${base}/slow`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '5');
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});

test('error responses keep their status and a readable name', async () => {
  const app = express();
  app.use(express.json());
  app.post('/json', (_req, res) => res.end());
  app.get('/conflict', () => { throw new ConflictError('Email already in use'); });
  app.use(errorHandler);
  await usingServer(app, async (base) => {
    const conflict = await fetch(`${base}/conflict`);
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).details, 'Email already in use');
    const malformed = await fetch(`${base}/json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error, 'BadRequest');
  });
});

test('request metrics are labelled by route pattern, not by raw path', async () => {
  const app = express();
  app.use(observeRequestDuration);
  app.get('/api/products/:slug', (_req, res) => res.end());
  await usingServer(app, async (base) => {
    await fetch(`${base}/api/products/one`);
    await fetch(`${base}/api/products/two`);
    await fetch(`${base}/nowhere`);
  });
  const text = await register.getSingleMetricAsString('http_request_duration_seconds');
  assert.match(text, /route="\/api\/products\/:slug"/);
  assert.match(text, /route="unmatched"/);
  assert.doesNotMatch(text, /products\/one|nowhere/);
});
