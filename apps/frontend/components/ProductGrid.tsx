'use client';

import { useApiSWR } from '../hooks/useApiSWR';
import { ProductCard, ProductCardSkeleton, type Product } from './ProductCard';
import { Button } from './ui/Button';

const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

export function ProductGrid({ catalogKey }: { catalogKey: string }) {
  const { data, error, mutate, isValidating } = useApiSWR<{ items: Product[]; total: number }>(catalogKey);

  if (error && !data) {
    return (
      <div role="alert" className="rounded-2xl border border-clay-300 bg-cream p-6">
        <p className="font-semibold">The catalog could not be loaded.</p>
        <p className="mt-1 text-ink-soft">The product service did not answer. Check your connection and try again.</p>
        <Button className="mt-4" onClick={() => mutate()} disabled={isValidating}>
          {isValidating ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  // Server-rendered fallback data counts as data; SWR still flags isLoading
  // while it revalidates, which would hide the catalog behind skeletons.
  if (!data) {
    return (
      <div className={GRID} role="status" aria-label="Loading products">
        {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <p role="status" className="rounded-2xl border border-dashed border-moss-600 p-6 text-ink-soft">
        No bottles are listed yet. Load the demo catalog with <code className="font-mono text-sm">make init</code>.
      </p>
    );
  }

  return (
    <ul className={GRID}>
      {data.items.map((product) => (
        <li key={product.id}><ProductCard product={product} /></li>
      ))}
    </ul>
  );
}
