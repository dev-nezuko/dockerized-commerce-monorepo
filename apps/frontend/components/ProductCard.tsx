import Image from 'next/image';

import { formatPrice } from '../lib/format';
import { resolveProductImageUrl } from '../lib/images';

export type Product = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  /** Absolute URL, a path under public/, or a Cloudinary public id. */
  imageUrl: string;
  shortDescription: string;
};

// Demo products share one illustration; a stable per-slug backdrop keeps the
// tiles distinguishable at a glance.
const BACKDROPS = ['bg-sage-100', 'bg-cream', 'bg-[#e3ece9]', 'bg-[#efe4d6]'];

function backdropFor(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BACKDROPS[hash % BACKDROPS.length];
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`relative aspect-[4/3] ${backdropFor(product.slug)}`}>
        <Image
          src={resolveProductImageUrl(product.imageUrl, 800)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
          <p className="shrink-0 font-display text-lg font-semibold text-clay-700">{formatPrice(product.priceCents)}</p>
        </div>
        <p className="text-ink-soft">{product.shortDescription}</p>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-sage-100 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-sage-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-sage-100" />
        <div className="h-4 w-full animate-pulse rounded bg-sage-50" />
      </div>
    </div>
  );
}
