import { Skeleton } from '@/components/ui/skeleton';

export default function RateBookLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-8 w-48 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded" />
        <Skeleton className="h-32 rounded" />
        <Skeleton className="h-32 rounded" />
      </div>
      <Skeleton className="h-64 rounded" />
    </div>
  );
}
