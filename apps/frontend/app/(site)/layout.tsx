import React from 'react';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="container py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-black" />
          <h1 className="text-lg font-semibold">Eco Bottle</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-8">
          {children}
        </div>
      </main>
      <footer className="border-t">
        <div className="container py-6 text-sm text-gray-500">© {new Date().getFullYear()} Eco Bottle</div>
      </footer>
    </div>
  );
}
