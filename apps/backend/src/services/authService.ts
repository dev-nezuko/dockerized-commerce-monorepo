import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { AuthError } from '../middleware/error';

const userRepo = () => AppDataSource.getRepository(User);

export async function register(email: string, password: string): Promise<User> {
  const existing = await userRepo().findOne({ where: { email } });
  if (existing) throw new AuthError('Email already in use');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = userRepo().create({ email, passwordHash });
  return await userRepo().save(user);
}

export async function login(email: string, password: string): Promise<{ token: string; jti: string; }>
{
  const user = await userRepo().findOne({ where: { email } });
  if (!user) throw new AuthError('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AuthError('Invalid credentials');

  const jti = randomUUID();
  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    jwtid: jti,
  });
  return { token, jti };
}

export async function logout(jti: string, expSeconds: number): Promise<void> {
  const key = `bl:${jti}`;
  await redis.set(key, '1', 'EX', expSeconds);
}

export function getTokenJti(token: string): string | undefined {
  try {
    const decoded = jwt.decode(token, { complete: true }) as { payload?: any } | null;
    return decoded?.payload?.jti as string | undefined;
  } catch {
    return undefined;
  }
}

export function verify(token: string): { userId: string; email: string; exp: number; jti: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    const jti = decoded.jti as string | undefined;
    if (!jti) throw new AuthError('Invalid token');
    return { userId: decoded.sub as string, email: decoded.email as string, exp: decoded.exp as number, jti };
  } catch (err) {
    throw new AuthError('Invalid token');
  }
}

export async function isBlacklisted(jti: string): Promise<boolean> {
  const key = `bl:${jti}`;
  const val = await redis.get(key);
  return val === '1';
}
