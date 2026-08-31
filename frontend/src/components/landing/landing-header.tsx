'use client';

import Link from 'next/link';
import { ClinicLogo } from '@/components/clinic-logo';
import { LandingShell } from '@/components/landing/landing-shell';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const externalLinkProps = { target: '_blank' as const, rel: 'noopener noreferrer' };

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy-900/90 backdrop-blur-md">
      <LandingShell innerClassName="flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Link href="/" className="shrink-0">
          <ClinicLogo inverted />
        </Link>
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            {...externalLinkProps}
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            {...externalLinkProps}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Get Started
          </Link>
          <Link
            href="/demo"
            {...externalLinkProps}
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-600"
          >
            Try Demo
          </Link>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-white sm:ml-0 sm:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </LandingShell>
      {open ? (
        <div className="border-t border-white/10 bg-navy-900 sm:hidden">
          <LandingShell innerClassName="flex flex-col gap-2 py-4">
            <Link
              href="/login"
              {...externalLinkProps}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              {...externalLinkProps}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              {...externalLinkProps}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Try Live Demo
            </Link>
          </LandingShell>
        </div>
      ) : null}
    </header>
  );
}
