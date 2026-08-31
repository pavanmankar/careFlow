import { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(15,39,68,0.05)]', className)}
      style={style}
    >
      {children}
    </div>
  );
}
