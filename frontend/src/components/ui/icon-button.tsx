'use client';

import { PortalLink } from '@/components/portal-navigation';
import { ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const iconClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40';

export function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(iconClass, tone === 'danger' && 'hover:bg-red-50 hover:text-red-600', className)}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function IconLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <PortalLink href={href} title={label} aria-label={label} className={iconClass}>
      <Icon className="h-4 w-4" />
    </PortalLink>
  );
}

export function BackLink({
  href,
  label,
  heading = false,
  children,
  className,
}: {
  href: string;
  label: string;
  heading?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-center gap-3', className)}>
      <PortalLink
        href={href}
        title="Back"
        aria-label="Back"
        className={cn(iconClass, 'shrink-0')}
      >
        <ArrowLeft className="h-4 w-4" />
      </PortalLink>
      {heading ? (
        <h1 className="text-2xl font-semibold text-navy-900">{label}</h1>
      ) : (
        <span className="text-sm font-medium text-slate-500">{label}</span>
      )}
      {children}
    </div>
  );
}
