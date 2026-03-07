import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary
          placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
