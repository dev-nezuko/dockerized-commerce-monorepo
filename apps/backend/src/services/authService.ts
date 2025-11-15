import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { redis } from '../config/redis';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { AuthError, ConflictError } from '../middleware/error';

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so a miss costs the same bcrypt
// time as a wrong password and response timing does not reveal accounts.
const UNKNOWN_USER_HASH = bcrypt.hashSync(randomUUID(), BCRYPT_ROUNDS);

const userRepo = () => AppDataSource.getRepository(User);

export async function register(email: string, password: string): Promise<User> {
  const existing = await userRepo().findOne({ where: { email } });
  if (existing) throw new ConflictError('Email already in use');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return userRepo().save(userRepo().create({ email, passwordHash }));
}

export async function login(email: string, password: string): Promise<{ token: string; jti: string }> {
  const user = await userRepo().findOne({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? UNKNOWN_USER_HASH);
  if (!user || !ok) throw new AuthError('Invalid credentials');

  const jti = randomUUID();
  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    jwtid: jti,
  });
  return { token, jti };
}

export async function logout(jti: string, expSeconds: number): Promise<void> {
  await redis.set(`bl:${jti}`, '1', 'EX', expSeconds);
}

export function verify(token: string): { userId: string; email: string; exp: number; jti: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.jti || !decoded.sub || !decoded.exp) throw new AuthError('Invalid token');
    return { userId: decoded.sub, email: String(decoded.email), exp: decoded.exp, jti: decoded.jti };
  } catch {
    throw new AuthError('Invalid token');
  }
}

export async function isBlacklisted(jti: string): Promise<boolean> {
  return (await redis.get(`bl:${jti}`)) === '1';
}
