import { Skeleton } from '@/components/ui/skeleton';

export default function NewQuoteLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-96 rounded" />
    </div>
  );
}
