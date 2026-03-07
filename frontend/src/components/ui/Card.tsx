import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
