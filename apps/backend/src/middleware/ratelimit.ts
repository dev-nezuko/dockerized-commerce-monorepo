import type { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';

export function rateLimitRedis({ windowSec, max }: { windowSec: number; max: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const key = `rl:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, max - count);
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining)));
      res.setHeader('RateLimit-Reset', String(Math.max(0, ttl)));
      if (count > max) {
        res.setHeader('Retry-After', String(Math.max(1, ttl)));
        res.status(429).json({ error: 'Too Many Requests' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
