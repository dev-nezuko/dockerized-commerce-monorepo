import { Suspense } from 'react';

import { ABHeadline } from '../../components/ABHeadline';
import { ClientProviders } from '../../components/ClientProviders';
import { HeroParallax } from '../../components/HeroParallax';
import { LeadForm } from '../../components/LeadForm';
import { ProductGrid } from '../../components/ProductGrid';
import { env } from '../../lib/env';

export const dynamic = 'force-dynamic';

const CATALOG_KEY = '/products?page=1&limit=12';

/** Server-side first page, so the catalog is in the HTML; SWR takes over in the browser. */
async function fetchInitialCatalog(): Promise<unknown> {
  try {
    const res = await fetch(`${env.INTERNAL_API_URL}${CATALOG_KEY}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : undefined;
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const initial = await fetchInitialCatalog();

  return (
    <ClientProviders fallback={initial ? { [CATALOG_KEY]: initial } : {}}>
      <HeroParallax />
      <section className="container py-14" aria-labelledby="intro-heading">
        <Suspense fallback={<h2 id="intro-heading" className="text-3xl font-semibold sm:text-4xl">Hydrate sustainably. Perform daily.</h2>}>
          <ABHeadline id="intro-heading" />
        </Suspense>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Glass, steel and bamboo bottles for desks, trails and school bags. Browse the range below and ask us anything about a
          bottle before you choose.
        </p>
      </section>
      <section id="collection" className="container scroll-mt-6 pb-16" aria-labelledby="collection-heading">
        <h2 id="collection-heading" className="mb-6 text-2xl font-semibold sm:text-3xl">The collection</h2>
        <ProductGrid catalogKey={CATALOG_KEY} />
      </section>
      <section className="border-t border-sage-100 bg-sage-50">
        <div className="container py-16">
          <Suspense>
            <LeadForm />
          </Suspense>
        </div>
      </section>
    </ClientProviders>
  );
}
