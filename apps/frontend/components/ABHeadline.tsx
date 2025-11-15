"use client";

import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    analytics?: { track?: (event: string, props?: Record<string, unknown>) => void };
  }
}

export function ABHeadline() {
  const sp = useSearchParams();
  const variant = (sp.get('variant') || 'a').toLowerCase();
  const text = variant === 'b' ? 'Save Plastic. Elevate Your Routine.' : 'Hydrate Sustainably. Perform Daily.';
  if (typeof window !== 'undefined') {
    try { window.analytics?.track?.('headline_variant', { variant }); } catch {}
  }
  return <h2 className="text-2xl sm:text-3xl font-semibold">{text}</h2>;
}
