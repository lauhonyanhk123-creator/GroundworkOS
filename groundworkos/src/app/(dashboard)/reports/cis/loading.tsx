import { Skeleton } from '@/components/ui/skeleton';

export default function CISReturnLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-48 rounded" />
      </div>
      <Skeleton className="h-24 rounded" />
      <Skeleton className="h-64 rounded" />
    </div>
  );
}
