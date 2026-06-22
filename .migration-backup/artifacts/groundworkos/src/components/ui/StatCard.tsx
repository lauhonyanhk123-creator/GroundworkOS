import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'warn';
  barPercent?: number;
  sub?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, changeType = 'up', barPercent, sub, className, icon }: StatCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded bg-[#141414] border border-[#2a2a2a] p-4', className)}>
      <div
        className="absolute top-0 right-0 w-12 h-12 opacity-10"
        style={{
          background: `repeating-linear-gradient(-45deg, #FFD600, #FFD600 2px, #0c0c0c 2px, #0c0c0c 6px)`,
        }}
      />
      {icon && <div className="mb-2 text-[#FFD600]">{icon}</div>}
      <p className="text-xs font-mono text-[#666666] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-condensed font-bold text-[#e8e8e8] mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
      {sub && <p className="text-xs text-[#666666] font-mono mb-2">{sub}</p>}
      {change && (
        <div className="flex items-center gap-1 text-xs">
          {changeType === 'up' && <TrendingUp className="w-3 h-3 text-[#4ade80]" />}
          {changeType === 'down' && <TrendingDown className="w-3 h-3 text-[#ff4444]" />}
          {changeType === 'warn' && <AlertTriangle className="w-3 h-3 text-[#fb923c]" />}
          <span className={cn('font-mono', changeType === 'up' && 'text-[#4ade80]', changeType === 'down' && 'text-[#ff4444]', changeType === 'warn' && 'text-[#fb923c]')}>
            {change}
          </span>
        </div>
      )}
      {barPercent !== undefined && (
        <div className="mt-3 h-1 w-full bg-[#242424] rounded-full overflow-hidden">
          <div className="h-full bg-[#FFD600] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }} />
        </div>
      )}
    </div>
  );
}
