import { ReactNode } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Package,
  Stethoscope,
  TrendingUp,
  UserRound,
} from 'lucide-react';

function BrowserFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-inner">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        <span className="ml-2 truncate text-[10px] font-medium text-slate-400 sm:text-xs">{label}</span>
      </div>
      <div className="min-h-0 flex-1 bg-[#F8F9FA]">{children}</div>
    </div>
  );
}

const sidebarItems = [
  { icon: LayoutDashboard, active: true },
  { icon: CalendarDays, active: false },
  { icon: Stethoscope, active: false },
  { icon: UserRound, active: false },
  { icon: Package, active: false },
];

const statCards = [
  { label: 'Patients', value: '248', trend: '+12 this month', icon: UserRound },
  { label: 'Visits', value: '32', trend: '8 today', icon: Stethoscope },
  { label: 'Revenue', value: '₹1.2L', trend: '+18%', icon: TrendingUp },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekValues = [18, 24, 21, 32, 28, 12, 8];

const todayQueue = [
  { time: '10:00', name: 'Rahul M.', status: 'Confirmed', tone: 'brand' as const },
  { time: '11:30', name: 'Priya S.', status: 'In clinic', tone: 'mint' as const },
  { time: '2:00', name: 'Vikram N.', status: 'Booked', tone: 'slate' as const },
];

function DashboardPreviewContent() {
  const maxVal = Math.max(...weekValues);

  return (
    <div className="flex h-full min-h-[240px]">
      <aside className="flex w-11 shrink-0 flex-col border-r border-slate-100 bg-white sm:w-12">
        <div className="flex h-9 items-center justify-center border-b border-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-[8px] font-bold text-white">
            CF
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-1.5">
          {sidebarItems.map(({ icon: Icon, active }, index) => (
            <div
              key={index}
              className={`flex h-7 items-center justify-center rounded-lg sm:h-8 ${
                active ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={active ? 2.25 : 2} />
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:gap-2.5 sm:p-2.5">
        <div>
          <div className="text-[10px] font-semibold text-navy-900 sm:text-[11px]">Hello there, welcome back!</div>
          <div className="mt-0.5 text-[8px] text-slate-500 sm:text-[9px]">Here is your overview for today.</div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {statCards.map(({ label, value, trend, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-100 bg-white px-2 py-1.5 shadow-sm sm:px-2.5 sm:py-2"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[7px] text-slate-500 sm:text-[8px]">{label}</span>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-mint text-brand-600">
                  <Icon className="h-2.5 w-2.5" />
                </span>
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-navy-900 sm:text-[11px]">{value}</div>
              <div className="mt-0.5 text-[6px] font-medium text-emerald-600 sm:text-[7px]">{trend}</div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
          <div className="flex min-h-0 flex-col rounded-lg border border-slate-100 bg-white p-2 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-semibold text-navy-900 sm:text-[9px]">Weekly visits</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[6px] font-medium text-slate-500">
                This week
              </span>
            </div>
            <div className="relative mt-2 flex min-h-0 flex-1 flex-col">
              <div className="pointer-events-none absolute inset-x-0 top-0 bottom-4 flex flex-col justify-between">
                {[0, 1, 2].map((line) => (
                  <div key={line} className="border-t border-dashed border-slate-100" />
                ))}
              </div>
              <div className="flex flex-1 items-end gap-1 border-b border-slate-200 pb-1 pl-0.5">
                {weekValues.map((value, index) => (
                  <div key={weekDays[index]} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full max-w-[12px] rounded-t-sm bg-gradient-to-t from-brand-600 to-brand-400"
                      style={{ height: `${Math.max(12, (value / maxVal) * 100)}%` }}
                    />
                    <span className="text-[6px] font-medium text-slate-400">{weekDays[index].slice(0, 1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-slate-100 bg-white p-2 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-semibold text-navy-900 sm:text-[9px]">Today&apos;s queue</span>
              <span className="rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[6px] font-semibold text-brand-700">
                32
              </span>
            </div>
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1">
              {todayQueue.map((row) => (
                <div
                  key={`${row.time}-${row.name}`}
                  className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${
                    row.tone === 'brand'
                      ? 'bg-brand-500/10'
                      : row.tone === 'mint'
                        ? 'bg-mint'
                        : 'bg-slate-50'
                  }`}
                >
                  <span className="w-7 shrink-0 text-[7px] font-medium text-slate-500">{row.time}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[7px] font-semibold text-navy-900 sm:text-[8px]">{row.name}</div>
                    <div className="text-[6px] text-slate-500">{row.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function DashboardPreview({ bare = false }: { bare?: boolean }) {
  if (bare) {
    return <DashboardPreviewContent />;
  }

  return (
    <BrowserFrame label="careflow.app/dashboard">
      <DashboardPreviewContent />
    </BrowserFrame>
  );
}

export function CalendarPreview() {
  return (
    <BrowserFrame label="careflow.app/calendar">
      <div className="space-y-2 p-2 sm:p-3">
        <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 shadow-sm">
          <div className="text-[10px] font-semibold text-navy-900 sm:text-xs">Calendar · Day view</div>
          <div className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[8px] font-medium text-brand-700">Dr. Neha</div>
        </div>
        {[
          { time: '10 AM – 11 AM', label: 'Rahul Mehta · Consultation', tone: 'booked' },
          { time: '11 AM – 12 PM', label: 'Free slot', tone: 'free' },
          { time: '12 PM – 1 PM', label: 'Free slot', tone: 'free' },
          { time: '1 PM – 2 PM', label: 'Priya Sharma · Follow-up', tone: 'soft' },
        ].map((row) => (
          <div
            key={row.time}
            className={`flex items-center gap-2 rounded-lg px-2 py-2 shadow-sm ${
              row.tone === 'booked'
                ? 'bg-brand-500 text-white'
                : row.tone === 'soft'
                  ? 'bg-brand-500/20 text-navy-900'
                  : 'bg-white text-slate-500'
            }`}
          >
            <span className="w-16 shrink-0 text-[8px] font-medium opacity-80 sm:text-[9px]">{row.time}</span>
            <span className="truncate text-[9px] font-medium sm:text-[10px]">{row.label}</span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

export function VisitChartPreview() {
  return (
    <BrowserFrame label="careflow.app/appointments/visit">
      <div className="space-y-2 p-2 sm:p-3">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <div className="text-[10px] font-bold text-navy-900 sm:text-xs">Rahul Mehta</div>
          <div className="mt-0.5 text-[8px] text-slate-500">Confirmed · Dr. Neha · 10:00 AM</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="text-[8px] font-semibold text-navy-900">Vitals</div>
            <div className="mt-1 space-y-0.5 text-[8px] text-slate-500">
              <div>BP 128/82</div>
              <div>Pulse 76 · SpO2 98%</div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="text-[8px] font-semibold text-navy-900">Medicines</div>
            <div className="mt-1 text-[8px] text-slate-500">Paracetamol 500mg</div>
            <div className="text-[8px] text-slate-400">Twice daily · 5 days</div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between text-[8px]">
            <span className="font-semibold text-navy-900">Consultation fee</span>
            <span className="font-semibold text-brand-700">₹525</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-mint">
            <div className="h-1.5 w-3/4 rounded-full bg-brand-500" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function PatientsPreview() {
  return (
    <BrowserFrame label="careflow.app/patients">
      <div className="space-y-2 p-2 sm:p-3">
        <div className="rounded-lg bg-white px-2 py-1.5 shadow-sm">
          <div className="text-[10px] font-semibold text-navy-900 sm:text-xs">Patients</div>
          <div className="mt-1 h-5 rounded-md bg-slate-100 px-2 text-[8px] leading-5 text-slate-400">Search patient…</div>
        </div>
        {[
          ['Rahul Mehta', '9876500001', 'O+'],
          ['Priya Sharma', '9876500002', 'A+'],
          ['Vikram Nair', '9876500003', 'B+'],
          ['Ananya Patel', '9876500004', 'AB+'],
        ].map(([name, phone, blood]) => (
          <div key={name} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[8px] font-bold text-brand-700">
              {name.split(' ').map((part) => part[0]).join('')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[9px] font-semibold text-navy-900 sm:text-[10px]">{name}</div>
              <div className="truncate text-[8px] text-slate-400">
                {phone} · {blood}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}
