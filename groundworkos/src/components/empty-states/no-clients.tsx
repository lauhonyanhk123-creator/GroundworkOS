import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface NoClientsProps {
  onAddClient?: () => void;
}

export function NoClients({ onAddClient }: NoClientsProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <Users className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No clients yet</h3>
      <p className="text-sm text-muted mb-6">
        Add your first client to get started
      </p>
      {onAddClient && (
        <Button onClick={onAddClient}>
          Add Client
        </Button>
      )}
    </div>
  );
}
