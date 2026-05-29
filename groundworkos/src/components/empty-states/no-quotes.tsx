import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface NoQuotesProps {
  onCreateQuote?: () => void;
}

export function NoQuotes({ onCreateQuote }: NoQuotesProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <FileText className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No quotes yet</h3>
      <p className="text-sm text-muted mb-6">
        Create your first quote for a client
      </p>
      {onCreateQuote && (
        <Button onClick={onCreateQuote}>
          Create Quote
        </Button>
      )}
    </div>
  );
}
