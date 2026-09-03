import Link from 'next/link';
import { LandingShell } from '@/components/landing/landing-shell';
import { DashboardPreview } from '@/components/landing/landing-product-previews';
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';

const highlights = [
  'Book, document, and bill in one flow',
  'MFA, roles, and branch isolation built in',
  'PDF summaries ready for patients',
];

const stats = [
  { value: '5 min', label: 'to explore the live demo' },
  { value: '100%', label: 'browser-based — no install' },
  { value: '24/7', label: 'access from any device' },
];

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden bg-navy-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-brand-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-mint/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <LandingShell className="relative py-14 sm:py-16 lg:py-24 xl:py-28">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 xl:gap-20">
          <div className="min-w-0 animate-landingFadeUp">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-mint backdrop-blur sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand-200" />
              Modern clinic operations platform
            </div>
            <h1 className="mt-6 text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.4rem]">
              The calm, complete workspace for growing clinics
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              CareFlow unifies patients, scheduling, clinical charts, inventory, and staff permissions — so your team
              spends less time switching tools and more time caring for patients.
            </p>
            <ul className="mt-6 space-y-2.5">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-200 sm:text-base">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-200" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 transition hover:bg-brand-600 sm:w-auto"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Try Live Demo
              </Link>
              <Link
                href="/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
              >
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-bold text-white sm:text-2xl">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-400 sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0 animate-landingFadeUp lg:[animation-delay:120ms]">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/30 to-transparent blur-2xl" />
            <div className="relative animate-landingFloat rounded-[1.75rem] border border-white/10 bg-white/95 p-3 shadow-[0_32px_80px_rgba(0,0,0,0.35)] sm:p-4 lg:p-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="truncate text-[10px] font-medium text-slate-400 sm:text-xs">careflow.app/dashboard</span>
              </div>
              <div className="aspect-[16/11] overflow-hidden rounded-xl border border-slate-200/80 bg-[#F8F9FA]">
                <DashboardPreview bare />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-2 hidden rounded-2xl border border-white/20 bg-navy-800/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Today&apos;s visits</div>
              <div className="mt-1 text-lg font-bold text-white">32 scheduled</div>
            </div>
            <div className="absolute -right-2 top-8 hidden rounded-2xl border border-brand-200/20 bg-brand-500 px-4 py-3 shadow-xl sm:block">
              <div className="text-[10px] font-medium uppercase tracking-wider text-brand-100">Visit saved</div>
              <div className="mt-1 text-sm font-semibold text-white">Chart synced</div>
            </div>
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
