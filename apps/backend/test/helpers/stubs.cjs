// Shared setup for the offline tests: TypeScript loading, synthetic config,
// module stubbing, an in-memory Redis stand-in and a throwaway HTTP server.
require('../../scripts/register-ts.cjs');
const http = require('node:http');
const Module = require('node:module');

process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'synthetic-unit-test-signing-key-'.repeat(2);
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

/** Requires a module while `stubs` answer for the given import specifiers. */
function loadWithStubs(stubs, load) {
  const original = Module._load;
  Module._load = function (request, ...rest) {
    if (Object.hasOwn(stubs, request)) return stubs[request];
    return original.call(this, request, ...rest);
  };
  try {
    return load();
  } finally {
    Module._load = original;
  }
}

/** Just enough of ioredis for the limiter, cache and blacklist. */
function fakeRedis() {
  const values = new Map();
  const expiry = new Map();
  const state = { failing: false, calls: 0 };
  const guard = () => {
    state.calls++;
    if (state.failing) throw new Error('Connection is closed.');
  };
  const ops = {
    get: (k) => values.get(k) ?? null,
    set: (k, v, ...args) => {
      if (args.includes('NX') && values.has(k)) return null;
      values.set(k, v);
      return 'OK';
    },
    del: (...keys) => keys.filter((k) => values.delete(k)).length,
    incr: (k) => {
      const n = Number(values.get(k) ?? 0) + 1;
      values.set(k, String(n));
      return n;
    },
    expire: (k, sec, mode) => {
      if (mode === 'NX' && expiry.has(k)) return 0;
      expiry.set(k, sec);
      return 1;
    },
    ttl: (k) => expiry.get(k) ?? -1,
    sadd: (k, m) => {
      const set = values.get(k) ?? new Set();
      set.add(m);
      values.set(k, set);
      return 1;
    },
    smembers: (k) => [...(values.get(k) ?? [])],
    ping: () => 'PONG',
  };
  const client = { state, values };
  for (const [name, fn] of Object.entries(ops)) {
    client[name] = async (...args) => {
      guard();
      return fn(...args);
    };
  }
  client.multi = () => {
    const queued = [];
    const chain = {
      exec: async () => {
        guard();
        return queued.map(([name, args]) => [null, ops[name](...args)]);
      },
    };
    for (const name of Object.keys(ops)) {
      chain[name] = (...args) => {
        queued.push([name, args]);
        return chain;
      };
    }
    return chain;
  };
  return client;
}

async function usingServer(app, run) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

module.exports = { loadWithStubs, fakeRedis, usingServer };
