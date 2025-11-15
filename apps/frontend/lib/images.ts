import { env } from './env';

export function resolveProductImageUrl(input: string, width = 1200): string {
  if (!input) return '/bottle-placeholder.svg';
  if (input.startsWith('/') && !input.startsWith('//')) return input;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  return `${env.CLOUDINARY_BASE}/q_auto,f_auto,w_${width}/${input}.jpg`;
}
