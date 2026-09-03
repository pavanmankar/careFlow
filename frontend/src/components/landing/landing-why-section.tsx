import { LandingShell } from '@/components/landing/landing-shell';
import {
  CalendarDays,
  Cloud,
  FileText,
  LayoutDashboard,
  Shield,
  Stethoscope,
  UserRound,
  Zap,
} from 'lucide-react';

const audienceCards = [
  {
    icon: LayoutDashboard,
    title: 'Clinic owners',
    description:
      'Manage subscriptions, locations, staff, and roles from one platform — with clear visibility across every branch.',
  },
  {
    icon: Stethoscope,
    title: 'Doctors & clinicians',
    description:
      'Capture vitals, clinical notes, medicines, and charges on a single visit page — then export PDF summaries instantly.',
  },
  {
    icon: UserRound,
    title: 'Front desk teams',
    description:
      'Book and reschedule from the calendar, search patients quickly, and keep today’s queue organised without extra tools.',
  },
];

const launchBenefits = [
  {
    icon: Cloud,
    title: 'Cloud-based',
    description: 'Works in any modern browser. No servers to install or maintain at your clinic.',
  },
  {
    icon: Zap,
    title: 'Fast to explore',
    description: 'Open the live demo in one click and walk through every module before you sign up.',
  },
  {
    icon: Shield,
    title: 'Security & access',
    description: 'Require MFA, assign roles, reset authenticators, and keep every branch isolated.',
  },
  {
    icon: CalendarDays,
    title: 'Scheduling built in',
    description: 'Month, week, and day views with doctor filters, booking, and reschedule workflows.',
  },
  {
    icon: FileText,
    title: 'PDF-ready visits',
    description: 'Generate visit summaries and prescription PDFs when documentation is complete.',
  },
  {
    icon: LayoutDashboard,
    title: 'All modules connected',
    description: 'Patients, appointments, inventory, and admin screens share one consistent workspace.',
  },
];

export function LandingWhySection() {
  return (
    <section className="w-full bg-gradient-to-b from-canvas to-white py-14 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">Why CareFlow</p>
          <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">
            Built for clinics launching smarter operations
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Whether you are opening a new practice or modernising an existing one, CareFlow gives every role the tools
            they need — from the first booking to the final patient handoff.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {audienceCards.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-brand-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,39,68,0.05)] sm:p-7"
            >
              <div className="inline-flex rounded-2xl bg-brand-500 p-3 text-white shadow-lg shadow-brand-500/20">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy-900 sm:text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <h3 className="text-center text-lg font-semibold text-navy-900 sm:text-xl">What you get from day one</h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {launchBenefits.map((item) => (
              <article
                key={item.title}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-white/80 p-5 transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-600">
                  <item.icon className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <h4 className="font-semibold text-navy-900">{item.title}</h4>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
