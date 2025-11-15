import type { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';

/**
 * Fixed-window limiter keyed by limiter name and client address. The address
 * is `req.ip`, so X-Forwarded-For only counts when `trust proxy` says so.
 * Redis failures let the request through: losing rate limiting briefly is
 * better than taking the whole API down with the cache.
 */
export function rateLimitRedis({ name, windowSec, max }: { name: string; windowSec: number; max: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${name}:${req.ip ?? 'unknown'}`;
    let count: number;
    let ttl: number;
    try {
      const results = await redis.multi().incr(key).expire(key, windowSec, 'NX').ttl(key).exec();
      count = Number(results?.[0]?.[1]);
      ttl = Number(results?.[2]?.[1]);
    } catch (err) {
      req.log?.warn({ err }, 'rate limiter unavailable; allowing request');
      next();
      return;
    }
    const reset = Math.max(1, ttl);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - count)));
    res.setHeader('RateLimit-Reset', String(reset));
    if (count > max) {
      res.setHeader('Retry-After', String(reset));
      res.status(429).json({ error: 'Too Many Requests' });
      return;
    }
    next();
  };
}
