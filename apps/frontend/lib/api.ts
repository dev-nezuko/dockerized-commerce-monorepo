import { env } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  // Server-side rendering talks to the API over the internal network.
  const base = typeof window === 'undefined' ? env.INTERNAL_API_URL : env.NEXT_PUBLIC_API_URL;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * JSON fetch with a per-attempt timeout. Only GET and HEAD are retried:
 * repeating a POST after a lost response could store the enquiry twice.
 */
export async function apiFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number; retries?: number }): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const method = (init?.method || 'GET').toUpperCase();
  const retries = method === 'GET' || method === 'HEAD' ? (init?.retries ?? 2) : 0;
  const url = resolveUrl(path);
  const headers: HeadersInit = { 'content-type': 'application/json', ...(init?.headers || {}) };

  const attempt = async (i: number): Promise<Response> => {
    // A fresh controller per attempt: an aborted signal cannot be reused.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, headers, signal: controller.signal });
    } catch (err) {
      if (i >= retries) throw err;
      await sleep(Math.min(1000 * 2 ** i, 3000));
      return attempt(i + 1);
    } finally {
      clearTimeout(timer);
    }
  };

  const res = await attempt(0);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    throw new ApiError(`API ${res.status}`, res.status, body);
  }
  return (await res.json()) as T;
}
