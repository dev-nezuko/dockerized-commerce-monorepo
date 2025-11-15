const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const http = require('node:http');
const originalLoad = Module._load;
process.env.DATABASE_URL = 'postgresql://local:local@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'synthetic-unit-test-key-'.repeat(3);
const repo = { findAndCount: async () => [[], 0] };
Module._load = function(request, parent, main) {
  if (request === '../data-source') return { AppDataSource: { getRepository: () => repo } };
  if (request === '../middleware/auth') return { requireAuth: () => (_req, _res, next) => next() };
  if (request === '../services/cache') return {
    withCache: async (_key, _ttl, factory) => ({ value: await factory(), hit: false }),
    invalidateBySet: async () => {}, removeKey: async () => {},
  };
  return originalLoad.apply(this, arguments);
};
const express = require('express');
const { productsRouter } = require('../src/routes/products');
const { errorHandler } = require('../src/middleware/error');
Module._load = originalLoad;
async function usingServer(app, run) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('product writes default to disabled even when authentication middleware succeeds', async () => {
  delete process.env.ENABLE_DEMO_PRODUCT_WRITES;
  const app = express();app.use(express.json());app.use(productsRouter());
  await usingServer(app, async base => {
    for (const [method, path] of [['POST','/api/products'],['PUT','/api/products/any'],['DELETE','/api/products/any']]) {
      const response = await fetch(base+path, { method, headers: {'content-type':'application/json'}, body:'{}' });
      assert.equal(response.status, 403);
    }
  });
});
test('invalid page values are rejected before catalog queries', async () => {
  let queries = 0;
  repo.findAndCount = async () => { queries++; return [[], 0]; };
  const app = express();app.use(productsRouter());
  await usingServer(app, async base => {
    for (const query of ['page=-1','page=0','page=1.5','page=100001','page=NaN','limit=NaN']) {
      assert.equal((await fetch(base+'/api/products?'+query)).status, 400);
    }
    assert.equal(queries, 0);
    assert.equal((await fetch(base+'/api/products?page=1&limit=12')).status, 200);
    assert.equal(queries, 1);
  });
});
test('unexpected errors do not return database details', async () => {
  const app = express();
  app.get('/', (_req,_res,next) => next(new Error('private database connection details')));
  app.use(errorHandler);
  await usingServer(app, async base => {
    const response = await fetch(base);
    assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await response.json()).includes('private database'), false);
  });
});
