import { cn } from '../../lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
  children: ReactNode;
}

export function Btn({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: BtnProps) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-[#FFD600] text-[#0a0a0a] hover:bg-[#e6c000] font-semibold',
    ghost: 'text-[#5a5a5a] hover:text-[#e2e2e2] hover:bg-[#161616]',
    danger: 'bg-[#e03a3a]/10 text-[#e03a3a] border border-[#e03a3a]/25 hover:bg-[#e03a3a]/20',
    outline: 'border border-[#222] text-[#7a7a7a] hover:border-[#333] hover:text-[#e2e2e2]',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
}
