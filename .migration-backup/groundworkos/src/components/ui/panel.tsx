import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title?: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Panel({
  title,
  count,
  actions,
  children,
  className,
  noPadding = false,
}: PanelProps) {
  return (
    <div className={cn('bg-surface border border-border rounded', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="text-sm font-semibold text-text font-condensed uppercase tracking-wide">
                {title}
              </h3>
            )}
            {count !== undefined && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-mono bg-surface-2 text-muted-2 rounded">
                {count}
              </span>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-4')}>
        {children}
      </div>
    </div>
  );
}
