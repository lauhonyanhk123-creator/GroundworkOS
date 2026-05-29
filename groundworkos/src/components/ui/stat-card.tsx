import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'warn';
  barPercent?: number;
  format?: 'number' | 'currency' | 'text';
  sub?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'up',
  barPercent,
  format = 'text',
  sub,
  className,
}: StatCardProps) {
  const displayValue = format === 'currency' && typeof value === 'number'
    ? formatCurrency(value)
    : value;

  return (
    <div className={cn('relative overflow-hidden rounded bg-surface border border-border p-4', className)}>
      <div
        className="absolute top-0 right-0 w-12 h-12 opacity-10"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            #FFD600,
            #FFD600 2px,
            #0c0c0c 2px,
            #0c0c0c 6px
          )`,
        }}
      />

      <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
        {label}
      </p>

      <p className="text-3xl font-condensed font-bold text-text mb-1">
        {displayValue}
      </p>

      {sub && (
        <p className="text-xs text-muted font-mono mb-2">{sub}</p>
      )}

      {change && (
        <div className="flex items-center gap-1 text-xs">
          {changeType === 'up' && (
            <TrendingUp className="w-3 h-3 text-success" />
          )}
          {changeType === 'down' && (
            <TrendingDown className="w-3 h-3 text-danger" />
          )}
          {changeType === 'warn' && (
            <AlertTriangle className="w-3 h-3 text-warning" />
          )}
          <span
            className={cn(
              'font-mono',
              changeType === 'up' && 'text-success',
              changeType === 'down' && 'text-danger',
              changeType === 'warn' && 'text-warning'
            )}
          >
            {change}
          </span>
        </div>
      )}

      {barPercent !== undefined && (
        <div className="mt-3 h-1 w-full bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
