import { LandingShell } from '@/components/landing/landing-shell';
import {
  CalendarPreview,
  DashboardPreview,
  PatientsPreview,
  VisitChartPreview,
} from '@/components/landing/landing-product-previews';

const shots = [
  {
    preview: DashboardPreview,
    title: 'Dashboard overview',
    description: 'KPIs, charts, and today’s schedule in one view.',
    accent: 'from-brand-500/10 to-mint/40',
  },
  {
    preview: CalendarPreview,
    title: 'Calendar scheduling',
    description: 'Month, week, and day views with doctor filters.',
    accent: 'from-emerald-500/10 to-mint/30',
  },
  {
    preview: VisitChartPreview,
    title: 'Visit documentation',
    description: 'Structured charts with vitals, medicines, and charges.',
    accent: 'from-sky-500/10 to-mint/30',
  },
  {
    preview: PatientsPreview,
    title: 'Patient registry',
    description: 'Searchable profiles with demographics and history.',
    accent: 'from-violet-500/10 to-mint/30',
  },
];

export function LandingScreenshots() {
  return (
    <section id="screenshots" className="w-full bg-canvas py-12 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 sm:text-sm">Product tour</p>
            <h2 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">See CareFlow in action</h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Explore the same screens your staff use every day — appointments, calendar, patients, and inventory.
            </p>
          </div>
          <p className="max-w-md text-sm text-slate-500 lg:text-right">
            Built for reception, clinical teams, and clinic owners — one workspace from booking to billing.
          </p>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-6">
          {shots.map((shot, index) => (
            <article
              key={shot.title}
              className="group flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_12px_32px_rgba(15,39,68,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,39,68,0.1)]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`relative aspect-[16/11] w-full bg-gradient-to-br ${shot.accent} p-3 sm:p-4`}>
                <div className="h-full transition duration-300 group-hover:scale-[1.02]">
                  <shot.preview />
                </div>
              </div>
              <div className="flex flex-1 flex-col border-t border-slate-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-navy-900 sm:text-lg">{shot.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{shot.description}</p>
              </div>
            </article>
          ))}
        </div>
      </LandingShell>
    </section>
  );
}
