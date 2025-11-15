'use client';

import { useSearchParams } from 'next/navigation';

const HEADLINES = {
  a: 'Hydrate sustainably. Perform daily.',
  b: 'Save plastic. Elevate your routine.',
} as const;

/** Copy variant chosen by `?variant=b`; there is no assignment or tracking behind it. */
export function ABHeadline({ id }: { id?: string }) {
  const variant = useSearchParams().get('variant')?.toLowerCase() === 'b' ? 'b' : 'a';
  return <h2 id={id} className="text-3xl font-semibold sm:text-4xl">{HEADLINES[variant]}</h2>;
}
