import { cn } from '@/lib/utils';

interface BadgeProps {
  status: string;
  variant?: 'default' | 'green' | 'yellow' | 'orange' | 'red' | 'blue';
  className?: string;
}

const statusVariants: Record<string, 'green' | 'yellow' | 'orange' | 'red' | 'blue'> = {
  active: 'green',
  complete: 'green',
  paid: 'green',
  accepted: 'green',
  valid: 'green',
  quoted: 'yellow',
  sent: 'yellow',
  draft: 'yellow',
  on_hold: 'orange',
  overdue: 'orange',
  expiring_soon: 'orange',
  enquiry: 'blue',
  net: 'blue',
  gross: 'blue',
  unverified: 'orange',
  unmatched: 'orange',
  cancelled: 'red',
  expired: 'red',
  rejected: 'red',
};

const variantStyles = {
  default: 'bg-surface-2 text-muted-2',
  green: 'bg-success/20 text-success border border-success/30',
  yellow: 'bg-yellow/20 text-yellow border border-yellow/30',
  orange: 'bg-warning/20 text-warning border border-warning/30',
  red: 'bg-danger/20 text-danger border border-danger/30',
  blue: 'bg-info/20 text-info border border-info/30',
};

export function Badge({ status, variant, className }: BadgeProps) {
  const resolvedVariant = variant || statusVariants[status] || 'default';
  const displayStatus = status.replace(/-/g, ' ').toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium font-mono tracking-wider uppercase',
        variantStyles[resolvedVariant],
        className
      )}
    >
      {displayStatus}
    </span>
  );
}
