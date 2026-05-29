import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';

interface NoJobsProps {
  onCreateJob?: () => void;
}

export function NoJobs({ onCreateJob }: NoJobsProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <Briefcase className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No jobs yet</h3>
      <p className="text-sm text-muted mb-6">
        Get started by creating your first job
      </p>
      {onCreateJob && (
        <Button onClick={onCreateJob}>
          Create Job
        </Button>
      )}
    </div>
  );
}
