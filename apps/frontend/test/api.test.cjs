const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const originalExtension = require.extensions['.ts'];
require.extensions['.ts'] = function(module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const { apiFetch } = require('../lib/api.ts');
require.extensions['.ts'] = originalExtension;
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
