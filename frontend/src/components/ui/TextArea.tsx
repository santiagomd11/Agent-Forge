import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, id, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full px-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary
          placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-y min-h-20 ${className}`}
        {...props}
      />
    </div>
  );
}
