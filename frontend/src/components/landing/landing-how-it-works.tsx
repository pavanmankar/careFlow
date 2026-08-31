import { LandingShell } from '@/components/landing/landing-shell';
import { MousePointerClick, Play, UserPlus } from 'lucide-react';

const steps = [
  {
    icon: Play,
    step: '01',
    title: 'Explore the live demo',
    description: 'Open our read-only demo clinic in one click — no signup required. Browse every module instantly.',
  },
  {
    icon: UserPlus,
    step: '02',
    title: 'Register your clinic',
    description: 'Create your workspace in minutes. Add doctors, staff, and locations with guided onboarding.',
  },
  {
    icon: MousePointerClick,
    step: '03',
    title: 'Run daily operations',
    description: 'Book appointments, document visits, manage inventory, and export PDFs — all from one dashboard.',
  },
];

export function LandingHowItWorks() {
  return (
    <section className="w-full bg-white py-14 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">How it works</p>
            <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">Go from curious to confident in three steps</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Whether you&apos;re evaluating software for the first time or migrating from legacy tools, CareFlow makes the
              path simple for owners, doctors, and front-desk staff.
            </p>
          </div>
          <div className="space-y-4">
            {steps.map((item, index) => (
              <article
                key={item.title}
                className="relative flex gap-4 rounded-2xl border border-slate-100 bg-canvas/50 p-5 transition hover:border-brand-200 hover:bg-white sm:gap-5 sm:p-6"
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                    <item.icon className="h-5 w-5" />
                  </div>
                  {index < steps.length - 1 ? (
                    <div className="mt-2 hidden h-full w-px flex-1 bg-brand-200/60 sm:block" />
                  ) : null}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{item.step}</div>
                  <h3 className="mt-1 text-lg font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
