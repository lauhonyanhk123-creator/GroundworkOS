import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export function Panel({ title, actions, children, className, noPad }: PanelProps) {
  return (
    <div className={cn('rounded-lg', className)} style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
