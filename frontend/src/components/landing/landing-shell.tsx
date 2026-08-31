import { cn } from '@/lib/cn';
import { ReactNode } from 'react';

export function LandingShell({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24', innerClassName)}>
        {children}
      </div>
    </div>
  );
}
