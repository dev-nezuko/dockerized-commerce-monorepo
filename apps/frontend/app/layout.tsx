import type { Metadata } from 'next';
import { Fraunces, Karla } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const karla = Karla({ subsets: ['latin'], variable: '--font-karla', display: 'swap' });

export const metadata: Metadata = {
  title: 'Eco Bottle · reusable bottle catalog',
  description: 'Browse a small catalog of reusable bottles and send a product enquiry.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
