'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center space-y-4 p-8">
        <div className="text-6xl font-condensed font-bold text-danger opacity-30">!</div>
        <h2 className="text-2xl font-condensed font-bold">Something went wrong</h2>
        <p className="text-muted text-sm max-w-sm mx-auto">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted opacity-50">ref: {error.digest}</p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
