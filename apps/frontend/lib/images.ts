import { env } from './env';

const PLACEHOLDER = '/bottle-placeholder.svg';
// Must match images.remotePatterns in next.config.ts; next/image throws for other hosts.
const REMOTE_HOSTS = new Set(['res.cloudinary.com']);

/** Maps a product's imageUrl (public/ path, absolute URL or Cloudinary id) to something next/image can load. */
export function resolveProductImageUrl(input: string, width = 1200): string {
  if (!input) return PLACEHOLDER;
  if (input.startsWith('/') && !input.startsWith('//')) return input;
  if (/^https?:\/\//.test(input)) {
    try {
      const url = new URL(input);
      return url.protocol === 'https:' && REMOTE_HOSTS.has(url.hostname) ? input : PLACEHOLDER;
    } catch {
      return PLACEHOLDER;
    }
  }
  if (!/^[\w-]+(\/[\w-]+)*$/.test(input)) return PLACEHOLDER;
  return `${env.CLOUDINARY_BASE}/q_auto,f_auto,w_${width}/${input}.jpg`;
}
