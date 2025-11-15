import { existsSync } from 'node:fs';

// Values already present in the environment win over the file.
if (existsSync('.env')) process.loadEnvFile('.env');

export function requiredValue(key: string, minimum = 1): string {
  const value = process.env[key];
  if (!value || value.length < minimum) throw new Error(`Configure ${key} with at least ${minimum} characters`);
  return value;
}

/** Express `trust proxy`: unset/false trusts nothing, a number trusts that many hops. */
function trustProxy(raw: string | undefined): boolean | number {
  if (!raw || raw === 'false') return false;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 1) throw new Error('TRUST_PROXY must be false or a positive hop count');
  return hops;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  HOST: process.env.HOST ?? '127.0.0.1',
  DATABASE_URL: requiredValue('DATABASE_URL'),
  JWT_SECRET: requiredValue('JWT_SECRET', 32),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  TRUST_PROXY: trustProxy(process.env.TRUST_PROXY),
};
