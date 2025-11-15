import { redis } from '../config/redis';
import { logger } from '../logger';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Read-through cache with a short lock so concurrent misses for the same key
 * load once. Redis is best effort here: once a cache call fails, the loader
 * runs and its result is returned uncached instead of failing the request.
 */
export async function withCache<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
  tagSetKey?: string,
): Promise<{ value: T; hit: boolean }> {
  let available = true;
  const attempt = async <R>(op: () => Promise<R>, fallback: R): Promise<R> => {
    if (!available) return fallback;
    try {
      return await op();
    } catch (err) {
      available = false;
      logger.warn({ err, key }, 'cache unavailable; reading through');
      return fallback;
    }
  };

  const cached = await attempt(() => getJSON<T>(key), null);
  if (cached !== null) return { value: cached, hit: true };

  const lockKey = `${key}:lock`;
  const haveLock = await attempt(async () => (await redis.set(lockKey, '1', 'PX', 5000, 'NX')) === 'OK', false);
  if (!haveLock && available) {
    // Another request is loading this key; give it a moment before loading too.
    await sleep(50 + Math.floor(Math.random() * 100));
    const second = await attempt(() => getJSON<T>(key), null);
    if (second !== null) return { value: second, hit: true };
  }

  try {
    const value = await loader();
    await attempt(async () => {
      const write = redis.multi().set(key, JSON.stringify(value), 'EX', ttlSec);
      if (tagSetKey) write.sadd(tagSetKey, key);
      await write.exec();
    }, undefined);
    return { value, hit: false };
  } finally {
    if (haveLock) await attempt(() => redis.del(lockKey), 0);
  }
}

export async function invalidateBySet(tagSetKey: string): Promise<void> {
  const keys = await redis.smembers(tagSetKey);
  await redis.del(...keys, tagSetKey);
}

export async function removeKey(key: string): Promise<void> {
  await redis.del(key);
}
