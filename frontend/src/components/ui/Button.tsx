import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-bg-primary hover:opacity-80 font-medium',
  secondary: 'bg-transparent text-text-primary border border-border hover:border-border-hover',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
  ghost: 'text-text-muted hover:text-text-primary hover:bg-hover-bg',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-[13px]',
  lg: 'px-6 py-2.5 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-body ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
