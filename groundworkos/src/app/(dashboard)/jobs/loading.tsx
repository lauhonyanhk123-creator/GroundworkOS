import { Skeleton } from '@/components/ui/skeleton';

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-12 w-full rounded" />
      <div className="flex justify-between">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded" />
        ))}
      </div>
    </div>
  );
}
