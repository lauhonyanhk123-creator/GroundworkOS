import { Skeleton } from '@/components/ui/skeleton';

export default function JobDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-32 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 rounded" />
          <Skeleton className="h-64 rounded" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded" />
          <Skeleton className="h-64 rounded" />
        </div>
      </div>
    </div>
  );
}
