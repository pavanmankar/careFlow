import { LandingShell } from '@/components/landing/landing-shell';
import {
  Building2,
  CalendarCheck,
  FileText,
  Globe,
  ShieldCheck,
  Users,
} from 'lucide-react';

const clinicTypes = [
  'Outpatient clinics',
  'Dental practices',
  'Multi-doctor centers',
  'Specialty day care',
  'Growing clinic groups',
];

const capabilities = [
  {
    icon: Building2,
    title: 'Multi-location ready',
    description: 'Manage one clinic or many branches from a single platform.',
  },
  {
    icon: Users,
    title: 'Every role supported',
    description: 'Reception, doctors, owners, and admins each get the right tools.',
  },
  {
    icon: CalendarCheck,
    title: 'Book to billing flow',
    description: 'Scheduling, visits, charges, and handoffs stay in one connected workflow.',
  },
  {
    icon: ShieldCheck,
    title: 'Security built in',
    description: 'MFA, RBAC, tenant isolation, and audit logging designed for healthcare teams.',
  },
  {
    icon: Globe,
    title: 'Works on any device',
    description: 'Browser-based on desktop, tablet, or phone — nothing to install.',
  },
  {
    icon: FileText,
    title: 'Charts & PDF exports',
    description: 'Vitals, medicines, charges, and print-ready visit summaries.',
  },
];

export function LandingTrustBar() {
  return (
    <section className="w-full border-b border-slate-200/70 bg-gradient-to-b from-white to-canvas py-12 sm:py-14 lg:py-16">
      <LandingShell>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">
            Launch-ready for modern healthcare teams
          </p>
          <h2 className="mt-3 text-xl font-bold text-navy-900 sm:text-2xl lg:text-3xl">
            Designed for growing healthcare teams
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Scheduling, clinical charts, inventory, and staff permissions in one calm workspace — ready to explore in
            minutes, not months.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {clinicTypes.map((name) => (
            <span
              key={name}
              className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:text-sm"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {capabilities.map((item) => (
            <article
              key={item.title}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,39,68,0.04)] transition hover:border-brand-200 hover:shadow-[0_12px_40px_rgba(15,39,68,0.08)] sm:p-6"
            >
              <div className="inline-flex rounded-xl bg-brand-500/10 p-2.5 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-navy-900 sm:text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </LandingShell>
    </section>
  );
}
