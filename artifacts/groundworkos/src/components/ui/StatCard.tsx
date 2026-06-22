import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, accent, danger, className }: StatCardProps) {
  return (
    <div className={cn('p-5 rounded-lg', className)} style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}>
      <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#5a5a5a', letterSpacing: '0.08em' }}>{label}</p>
      <p className="text-3xl font-bold leading-none" style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        color: danger ? '#e03a3a' : accent ? '#e2e2e2' : '#e2e2e2',
      }}>{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: '#5a5a5a' }}>{sub}</p>}
    </div>
  );
}
