'use client';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
export function ClientProviders({ children, fallback }: { children: ReactNode; fallback: Record<string, unknown> }) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
