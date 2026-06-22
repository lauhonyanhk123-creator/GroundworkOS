import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#1c1c1c] animate-pulse rounded', className)} />;
}
