'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-danger mx-auto opacity-60" />
        <div>
          <h2 className="text-lg font-condensed font-bold">Something went wrong</h2>
          <p className="text-muted text-sm mt-1 max-w-sm">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
