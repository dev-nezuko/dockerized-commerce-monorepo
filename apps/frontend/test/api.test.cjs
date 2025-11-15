require('./helpers/register-ts.cjs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const { apiFetch, ApiError } = require('../lib/api.ts');

const realFetch = global.fetch;
after(() => { global.fetch = realFetch; });

test('a timed-out GET retry gets a fresh abort signal', async () => {
  let attempts = 0;
  global.fetch = async (_url, init) => {
    attempts++;
    assert.equal(init.signal.aborted, false);
    if (attempts === 1) return new Promise((_resolve, reject) =>
      init.signal.addEventListener('abort', () => reject(new Error('synthetic timeout')), { once: true }));
    return new Response(JSON.stringify({ value: 'recovered' }), { status: 200 });
  };
  const value = await apiFetch('/products', { timeoutMs: 10, retries: 1 });
  assert.deepEqual(value, { value: 'recovered' });
  assert.equal(attempts, 2);
});

test('mutating requests are not retried after an ambiguous transport failure', async () => {
  let attempts = 0;
  global.fetch = async () => { attempts++; throw new Error('synthetic lost response'); };
  await assert.rejects(apiFetch('/leads', { method: 'POST', retries: 3 }));
  assert.equal(attempts, 1);
});

test('HTTP errors surface as ApiError with the status and parsed body', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 });
  await assert.rejects(apiFetch('/leads', { method: 'POST' }), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 429);
    assert.deepEqual(err.body, { error: 'Too Many Requests' });
    return true;
  });
});

test('server-side calls use the internal API base', async () => {
  let requested;
  global.fetch = async (url) => { requested = url; return new Response('[]', { status: 200 }); };
  await apiFetch('/products?page=1');
  assert.equal(requested, 'http://localhost:4000/api/products?page=1');
});
