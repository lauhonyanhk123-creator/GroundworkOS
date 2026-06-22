import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, actions, children, className }: PanelProps) {
  return (
    <div className={cn('bg-[#141414] border border-[#2a2a2a] rounded', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h3 className="text-sm font-mono text-[#888888] uppercase tracking-wider">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
