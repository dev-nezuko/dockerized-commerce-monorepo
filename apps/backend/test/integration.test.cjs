// Runs the real app against disposable Postgres and Redis instances.
// Skipped unless TEST_DATABASE_URL and TEST_REDIS_URL are set; the suite
// truncates every table and flushes the Redis database it is given.
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { usingServer } = require('./helpers/stubs.cjs');

const enabled = Boolean(process.env.TEST_DATABASE_URL && process.env.TEST_REDIS_URL);

describe('API against Postgres and Redis', { skip: !enabled && 'set TEST_DATABASE_URL and TEST_REDIS_URL' }, () => {
  let AppDataSource, redis, app, base, closeServer;

  before(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
    delete process.env.ENABLE_DEMO_PRODUCT_WRITES;
    ({ AppDataSource } = require('../src/data-source'));
    ({ redis } = require('../src/config/redis'));
    const dir = path.join(__dirname, '../src/migrations');
    const migrations = fs.readdirSync(dir).flatMap((file) => Object.values(require(path.join(dir, file))));
    AppDataSource.setOptions({ migrations });
    await AppDataSource.initialize();
    await AppDataSource.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await AppDataSource.runMigrations();
    app = require('../src/server').buildExpressApp();
    await new Promise((resolve) => {
      usingServer(app, (url) => {
        base = url;
        resolve();
        return new Promise((done) => { closeServer = done; });
      });
    });
  });

  after(async () => {
    closeServer?.();
    await AppDataSource?.destroy();
    await redis?.quit();
  });

  beforeEach(async () => {
    await AppDataSource.query('TRUNCATE "lead", "product", "user"');
    await redis.flushdb();
  });

  const json = (method, url, body, headers = {}) => fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const insertProducts = (count) => AppDataSource.query(
    `INSERT INTO product (slug, name, "priceCents", "imageUrl", "shortDescription", "createdAt")
     SELECT 'bottle-' || n, 'Bottle ' || n, 1000 + n, '/bottle-placeholder.svg', 'Demo bottle',
            now() - make_interval(mins => n)
     FROM generate_series(1, $1) AS n`, [count]);

  test('the migration creates the schema and readiness reports both stores', async () => {
    const tables = await AppDataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1");
    assert.deepEqual(tables.map((t) => t.table_name), ['lead', 'migrations', 'product', 'user']);
    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: 'ready', database: 'ok', cache: 'ok' });
  });

  test('register, log in, read the session, log out and see the token revoked', async () => {
    const password = crypto.randomBytes(12).toString('hex');
    const created = await json('POST', '/api/auth/register', { email: 'Demo.User@Example.test', password });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).email, 'demo.user@example.test');
    assert.equal((await json('POST', '/api/auth/register', { email: 'demo.user@example.test', password })).status, 409);

    assert.equal((await json('POST', '/api/auth/login', { email: 'demo.user@example.test', password: 'wrong-password' })).status, 401);
    assert.equal((await json('POST', '/api/auth/login', { email: 'nobody@example.test', password })).status, 401);
    const login = await json('POST', '/api/auth/login', { email: 'DEMO.user@example.test', password });
    assert.equal(login.status, 200);
    const auth = { authorization: `Bearer ${(await login.json()).token}` };

    const me = await fetch(`${base}/api/auth/me`, { headers: auth });
    assert.equal((await me.json()).user.email, 'demo.user@example.test');
    assert.equal((await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: auth })).status, 204);
    const revoked = await fetch(`${base}/api/auth/me`, { headers: auth });
    assert.equal(revoked.status, 401);
    assert.equal((await revoked.json()).details, 'Token revoked');
  });

  test('the catalog pages newest first, caches reads and honours ETags', async () => {
    await insertProducts(15);
    const first = await fetch(`${base}/api/products?page=1&limit=12`);
    assert.match(first.headers.get('server-timing'), /cache;desc="MISS"/);
    const body = await first.json();
    assert.equal(body.total, 15);
    assert.deepEqual(body.items.slice(0, 2).map((p) => p.slug), ['bottle-1', 'bottle-2']);

    const second = await fetch(`${base}/api/products?page=1&limit=12`);
    assert.match(second.headers.get('server-timing'), /cache;desc="HIT"/);
    const etag = second.headers.get('etag');
    assert.equal((await fetch(`${base}/api/products?page=1&limit=12`, { headers: { 'if-none-match': etag } })).status, 304);

    const page2 = await (await fetch(`${base}/api/products?page=2&limit=12`)).json();
    assert.equal(page2.items.length, 3);
    assert.equal((await fetch(`${base}/api/products/bottle-7`)).status, 200);
    assert.equal((await fetch(`${base}/api/products/no-such-bottle`)).status, 404);
  });

  test('demo writes invalidate cached catalog pages', async () => {
    process.env.ENABLE_DEMO_PRODUCT_WRITES = 'true';
    try {
      const password = crypto.randomBytes(12).toString('hex');
      await json('POST', '/api/auth/register', { email: 'editor@example.test', password });
      const { token } = await (await json('POST', '/api/auth/login', { email: 'editor@example.test', password })).json();
      const auth = { authorization: `Bearer ${token}` };
      assert.equal((await (await fetch(`${base}/api/products`)).json()).total, 0);

      const product = { slug: 'glass-carafe', name: 'Glass carafe', priceCents: 1899, imageUrl: '/bottle-placeholder.svg', shortDescription: 'Demo' };
      const created = await json('POST', '/api/products', product, auth);
      assert.equal(created.status, 201);
      const { id } = await created.json();
      assert.equal((await (await fetch(`${base}/api/products`)).json()).total, 1);

      assert.equal((await json('PUT', `/api/products/${id}`, { priceCents: 1999 }, auth)).status, 200);
      assert.equal((await (await fetch(`${base}/api/products/glass-carafe`)).json()).priceCents, 1999);
      assert.equal((await json('DELETE', `/api/products/${id}`, undefined, auth)).status, 204);
      assert.equal((await fetch(`${base}/api/products/glass-carafe`)).status, 404);
    } finally {
      delete process.env.ENABLE_DEMO_PRODUCT_WRITES;
    }
  });

  test('repeat enquiries are all stored, up to five a minute per address', async () => {
    const lead = (n) => ({ name: 'Demo Person', email: 'demo@example.test', message: `Question ${n}`, utmSource: 'newsletter' });
    for (let n = 1; n <= 5; n++) {
      const response = await json('POST', '/api/leads', lead(n));
      assert.equal(response.status, 201, `enquiry ${n}`);
    }
    const limited = await json('POST', '/api/leads', lead(6));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    const [{ count }] = await AppDataSource.query('SELECT count(*)::int AS count FROM lead');
    assert.equal(count, 5);
    // Catalog reads use a separate budget and still work.
    assert.equal((await fetch(`${base}/api/products`)).status, 200);
  });

  test('the seed is idempotent and keeps an existing account', async () => {
    const env = {
      ...process.env,
      SEED_USER_EMAIL: 'seed@example.test',
      SEED_USER_PASSWORD: crypto.randomBytes(12).toString('hex'),
    };
    const run = () => execFileSync(process.execPath, ['-r', './scripts/register-ts.cjs', 'src/seeds/seed.ts'], {
      cwd: path.join(__dirname, '..'), env, encoding: 'utf8',
    });
    run();
    const [{ hash }] = await AppDataSource.query(`SELECT "passwordHash" AS hash FROM "user" WHERE email = 'seed@example.test'`);
    run();
    const [{ count }] = await AppDataSource.query('SELECT count(*)::int AS count FROM product');
    assert.equal(count, 12);
    const users = await AppDataSource.query(`SELECT "passwordHash" AS hash FROM "user"`);
    assert.deepEqual(users.map((u) => u.hash), [hash]);
  });
});
