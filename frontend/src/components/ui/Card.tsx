import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-secondary border border-border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
