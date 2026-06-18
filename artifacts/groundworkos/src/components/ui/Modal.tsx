import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cn('w-full max-h-[90vh] overflow-y-auto rounded', wide ? 'max-w-2xl' : 'max-w-lg')} style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ borderBottom: '1px solid #2a2a2a', backgroundColor: '#141414' }}>
          <h2 className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#1c1c1c] transition-colors" style={{ color: '#666666' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: '#666666' }}>
        {label}{required && <span style={{ color: '#ff4444' }}> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs" style={{ color: '#444444' }}>{hint}</p>}
    </div>
  );
}

const inputCls = "w-full py-2 px-3 rounded text-sm focus:outline-none transition-colors";
const inputStyle = { backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" };

export function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(inputCls, props.className)}
      style={inputStyle}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#FFD600'; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#2a2a2a'; props.onBlur?.(e); }}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputCls, props.className)}
      style={inputStyle}
      onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = '#FFD600'; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = '#2a2a2a'; props.onBlur?.(e); }}
    >
      {children}
    </select>
  );
}

export function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputCls, 'resize-none', props.className)}
      style={{ ...inputStyle, minHeight: '80px' }}
      onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#FFD600'; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#2a2a2a'; props.onBlur?.(e); }}
    />
  );
}
