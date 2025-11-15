import Link from 'next/link';

import { BottleMark } from '../../components/BottleMark';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-cream focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-forest-800 bg-forest-950 text-cream">
        <div className="container flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 rounded">
            <BottleMark className="h-7 w-7" />
            <span className="font-display text-xl font-semibold">Eco Bottle</span>
          </Link>
          <nav aria-label="Primary">
            <ul className="flex gap-5 text-sm font-medium">
              <li><a className="rounded underline-offset-4 hover:underline" href="#collection">Collection</a></li>
              <li><a className="rounded underline-offset-4 hover:underline" href="#lead-form">Ask a question</a></li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-sage-100 bg-sage-50">
        <div className="container flex flex-col gap-1 py-8 text-sm text-ink-soft sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Eco Bottle demo catalog</p>
          <p>Prices are illustrative. No orders or payments are taken.</p>
        </div>
      </footer>
    </div>
  );
}
