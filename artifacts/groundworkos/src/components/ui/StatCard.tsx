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
    <div className={cn('p-5 rounded-lg', className)} style={{
      backgroundColor: '#fafaf8',
      border: '1px solid #d9d4ce',
      borderLeft: danger ? '3px solid #c13a2a' : accent ? '3px solid #1b5e78' : '3px solid #d9d4ce',
    }}>
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#7a7469',
        marginBottom: '10px',
      }}>{label}</p>
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: '28px',
        lineHeight: 1,
        color: danger ? '#c13a2a' : '#181410',
        marginBottom: sub ? '6px' : 0,
      }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#7a7469' }}>{sub}</p>}
    </div>
  );
}
