import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-48 rounded" />
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-64 rounded" />
    </div>
  );
}
