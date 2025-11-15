import Redis from 'ioredis';
import { env } from './env';

// Bounded failure: a command fails after one retry or one second instead of
// queueing forever while Redis is unreachable.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  commandTimeout: 1000,
});

export default redis;
