import { LandingShell } from '@/components/landing/landing-shell';
import { CalendarDays, LayoutDashboard, Package, Shield, Stethoscope, UserRound } from 'lucide-react';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Executive dashboard',
    description: 'Real-time KPIs, revenue trends, and today’s schedule — everything leadership needs in one screen.',
    span: 'lg:col-span-2',
    featured: true,
  },
  {
    icon: CalendarDays,
    title: 'Smart scheduling',
    description: 'Month, week, and day views with doctor filters, booking, and reschedule workflows.',
    span: '',
    featured: false,
  },
  {
    icon: Stethoscope,
    title: 'Clinical visit charts',
    description: 'Vitals, notes, medicines, charges, and PDF exports in a structured visit workflow.',
    span: '',
    featured: false,
  },
  {
    icon: UserRound,
    title: 'Patient registry',
    description: 'Searchable profiles with demographics, emergency contacts, allergies, and visit history.',
    span: '',
    featured: false,
  },
  {
    icon: Package,
    title: 'Inventory control',
    description: 'Track stock by category with low-stock visibility across your clinic supplies.',
    span: '',
    featured: false,
  },
  {
    icon: Shield,
    title: 'Roles & permissions',
    description: 'Granular access for reception, doctors, and owners — plus multi-clinic platform admin.',
    span: 'lg:col-span-2',
    featured: false,
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="w-full bg-canvas py-14 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">Why CareFlow</p>
          <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">
            One platform for every clinic workflow
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Replace scattered spreadsheets and disconnected tools with a single system your whole team can trust —
            from the front desk to the consulting room.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,39,68,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,39,68,0.08)] sm:p-7 ${feature.span} ${
                feature.featured ? 'lg:p-8' : ''
              }`}
            >
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5 transition group-hover:bg-brand-500/10" />
              <div className="relative">
                <div
                  className={`inline-flex rounded-2xl p-3 ${
                    feature.featured ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' : 'bg-brand-500/10 text-brand-600'
                  }`}
                >
                  <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className={`mt-5 font-semibold text-navy-900 ${feature.featured ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </LandingShell>
    </section>
  );
}
