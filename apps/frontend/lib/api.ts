import { env } from './env';

class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function apiFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number; retries?: number }): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const method = (init?.method || 'GET').toUpperCase();
  const retries = method === 'GET' || method === 'HEAD' ? (init?.retries ?? 2) : 0;

  // Use INTERNAL_API_URL on the server (SSR) to avoid container DNS issues
  const isServer = typeof window === 'undefined';
  if (!path.startsWith('http')) {
    if (isServer) {
      const base = process.env.INTERNAL_API_URL || env.INTERNAL_API_URL;
      path = `${base}${path}`;
    } else {
      // In the browser, hit Nginx at the same origin
      path = `${env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    }
  }
  const url = path;
  const headers: HeadersInit = {
    'content-type': 'application/json',
    'x-request-id': randomId(),
    ...(init?.headers || {}),
  };

  const attempt = async (i: number): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, headers, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      if (i >= retries) throw err;
      const backoff = Math.min(1000 * Math.pow(2, i), 3000);
      await sleep(backoff);
      return attempt(i + 1);
    }
  };

  const res = await attempt(0);
  if (!res.ok) {
    let data: unknown;
    try { data = await res.json(); } catch {}
    throw new ApiError(`API ${res.status}`, res.status, data);
  }
  return (await res.json()) as T;
}

export { ApiError };
