import { ClientProviders } from '../components/ClientProviders';
export const dynamic = 'force-dynamic';
import { env } from '../lib/env';
import { HeroParallax } from '../components/HeroParallax';
import { ABHeadline } from '../components/ABHeadline';
import { ProductGrid } from '../components/ProductGrid';
import { LeadForm } from '../components/LeadForm';

export const metadata = {
  title: 'Eco-Friendly Water Bottle',
  description: 'Hydrate sustainably with performance bottles.',
};

async function fetchInitial() {
  const isServer = typeof window === 'undefined';
  const base = isServer ? (process.env.INTERNAL_API_URL || env.INTERNAL_API_URL) : env.NEXT_PUBLIC_API_URL;
  try {
    const res = await fetch(`${base}/products?page=1&limit=12`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return undefined;
    return res.json();
  } catch { return undefined; }

}

export default async function Page() {
  const initial = await fetchInitial();
  const key = `/products?page=1&limit=12`;


  return (
    <ClientProviders fallback={initial ? { [key]: initial } : {}}>
      <div>
        <HeroParallax />
        <section className="container py-12">
          <ABHeadline />
          <p className="text-gray-600 mt-2">A small product-catalog exercise with a real API boundary and a simple enquiry form.</p>
        </section>
        <section className="container py-12">
          <h2 className="text-2xl font-semibold mb-4">The collection</h2>
          <ProductGrid initialKey={key} />
        </section>
        <section className="container py-12">
          <h2 className="text-2xl font-semibold mb-4">Ask about a bottle</h2>
          <LeadForm />
        </section>
      </div>
    </ClientProviders>
  );
}
