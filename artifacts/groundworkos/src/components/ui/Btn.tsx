import { cn } from '../../lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
  children: ReactNode;
}

export function Btn({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: BtnProps) {
  const base = 'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-[#FFD600] text-[#0c0c0c] hover:bg-[#e6c000] font-bold',
    ghost: 'text-[#666666] hover:text-[#e8e8e8] hover:bg-[#1c1c1c]',
    danger: 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30 hover:bg-[#ff4444]/20',
    outline: 'border border-[#2a2a2a] text-[#888888] hover:border-[#FFD600] hover:text-[#e8e8e8]',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
}
