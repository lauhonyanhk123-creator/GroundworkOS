import { Button } from '@/components/ui/button';
import { HardHat } from 'lucide-react';

interface NoSubcontractorsProps {
  onAddSubcontractor?: () => void;
}

export function NoSubcontractors({ onAddSubcontractor }: NoSubcontractorsProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <HardHat className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No subcontractors yet</h3>
      <p className="text-sm text-muted mb-6">
        Add your first subcontractor to manage CIS compliance
      </p>
      {onAddSubcontractor && (
        <Button onClick={onAddSubcontractor}>
          Add Subcontractor
        </Button>
      )}
    </div>
  );
}
