import { Skeleton } from '@/components/ui/skeleton';

export default function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded" />
        ))}
      </div>
      <Skeleton className="h-64 rounded" />
    </div>
  );
}
