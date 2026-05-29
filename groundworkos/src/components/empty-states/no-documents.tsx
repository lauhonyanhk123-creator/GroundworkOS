import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface NoDocumentsProps {
  onUpload?: () => void;
}

export function NoDocuments({ onUpload }: NoDocumentsProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <Upload className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No documents yet</h3>
      <p className="text-sm text-muted mb-6">
        Upload compliance documents to track expiry dates
      </p>
      {onUpload && (
        <Button onClick={onUpload}>
          Upload Document
        </Button>
      )}
    </div>
  );
}
