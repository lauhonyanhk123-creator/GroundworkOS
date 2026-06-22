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
    <div className={cn('rounded-lg overflow-hidden', className)} style={{
      backgroundColor: '#fafaf8',
      border: '1px solid #d9d4ce',
    }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #d9d4ce' }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#1b5e78',
          }}>{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
