"use client";

import React from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container py-20">
      <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
      <p className="mb-6 text-gray-600">Please try again or refresh the page.</p>
      <button className="px-4 py-2 rounded-md bg-black text-white" onClick={() => reset()}>Try again</button>
    </div>
  );
}
