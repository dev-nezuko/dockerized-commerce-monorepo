import { redis } from '../config/redis';

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown, ttlSec: number): Promise<void> {
  const raw = JSON.stringify(value);
  await redis.set(key, raw, 'EX', ttlSec);
}

async function acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
  const res = await redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
  return res === 'OK';
}

async function releaseLock(lockKey: string): Promise<void> {
  try {
    await redis.del(lockKey);
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withCache<T>(key: string, ttlSec: number, loader: () => Promise<T>, tagSetKey?: string): Promise<{ value: T; hit: boolean }>
{
  const cached = await getJSON<T>(key);
  if (cached !== null) {
    return { value: cached, hit: true };
  }

  const lockKey = `${key}:lock`;
  const haveLock = await acquireLock(lockKey, 5000);
  if (haveLock) {
    try {
      const value = await loader();
      await setJSON(key, value, ttlSec);
      if (tagSetKey) {
        try { await redis.sadd(tagSetKey, key); } catch {}
      }
      return { value, hit: false };
    } finally {
      await releaseLock(lockKey);
    }
  }

  // Someone else is loading; wait with jitter and try once more
  const jitter = 50 + Math.floor(Math.random() * 100);
  await sleep(jitter);
  const secondTry = await getJSON<T>(key);
  if (secondTry !== null) {
    return { value: secondTry, hit: true };
  }
  // As a fallback, load ourselves
  const value = await loader();
  await setJSON(key, value, ttlSec);
  if (tagSetKey) {
    try { await redis.sadd(tagSetKey, key); } catch {}
  }
  return { value, hit: false };
}

export async function invalidateBySet(tagSetKey: string): Promise<void> {
  const keys = await redis.smembers(tagSetKey);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(tagSetKey);
}

export async function removeKey(key: string): Promise<void> {
  await redis.del(key);
}
