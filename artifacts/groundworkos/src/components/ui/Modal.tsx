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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cn('w-full max-h-[90vh] overflow-y-auto rounded-lg', wide ? 'max-w-2xl' : 'max-w-lg')} style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a', boxShadow: '0 32px 80px rgba(0,0,0,0.9)' }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#111111' }}>
          <h2 className="text-base font-semibold" style={{ color: '#e2e2e2' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors" style={{ color: '#5a5a5a' }}>
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
      <label className="block text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: '#5a5a5a', letterSpacing: '0.07em' }}>
        {label}{required && <span style={{ color: '#e03a3a' }}> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs" style={{ color: '#3a3a3a' }}>{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full py-2 px-3 rounded-md text-sm focus:outline-none transition-colors';
const inputStyle = { backgroundColor: '#181818', border: '1px solid #1e1e1e', color: '#e2e2e2' };
const inputFocusBorder = '#2a2a2a';
const inputBlurBorder = '#1e1e1e';

export function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(inputCls, props.className)}
      style={inputStyle}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = inputFocusBorder; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = inputBlurBorder; props.onBlur?.(e); }}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputCls, props.className)}
      style={inputStyle}
      onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = inputFocusBorder; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = inputBlurBorder; props.onBlur?.(e); }}
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
      onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = inputFocusBorder; props.onFocus?.(e); }}
      onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = inputBlurBorder; props.onBlur?.(e); }}
    />
  );
}
