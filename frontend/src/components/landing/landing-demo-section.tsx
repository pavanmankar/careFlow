import Link from 'next/link';
import { LandingShell } from '@/components/landing/landing-shell';
import { PUBLIC_DEMO } from '@/lib/demo';
import { ArrowRight, Eye, Lock, Sparkles } from 'lucide-react';

export function LandingDemoSection() {
  return (
    <section id="demo" className="w-full bg-white py-14 sm:py-20 lg:py-24">
      <LandingShell>
        <div className="relative overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-brand-600/10 blur-3xl" />
          </div>
          <div className="relative grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
                <Eye className="h-3.5 w-3.5" />
                Live demo
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                Experience CareFlow before you commit
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Step inside a fully loaded demo clinic with patients, appointments, doctors, and inventory. Explore every
                screen at your own pace — no credit card, no setup.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'View-only access keeps the demo clean for everyone',
                  `Sample data in ${PUBLIC_DEMO.clinicName}`,
                  'One-click entry — or sign in manually',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200 sm:text-base">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-600"
              >
                Enter live demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-7">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Lock className="h-4 w-4 text-brand-600" />
                Demo credentials
              </div>
              <dl className="mt-5 space-y-4">
                <div className="rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-navy-900 sm:text-base">{PUBLIC_DEMO.email}</dd>
                </div>
                <div className="rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Password</dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900 sm:text-base">{PUBLIC_DEMO.password}</dd>
                </div>
              </dl>
              <Link
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Prefer manual sign-in? Go to login →
              </Link>
            </div>
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
