import Link from 'next/link';
import { ClinicLogo } from '@/components/clinic-logo';
import { LandingShell } from '@/components/landing/landing-shell';
import { LandingLegalLinks } from '@/components/landing/landing-legal-links';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '#video', label: 'Demo video' },
      { href: '#features', label: 'Features' },
      { href: '#security', label: 'Security' },
      { href: '#screenshots', label: 'Screenshots' },
      { href: '#demo', label: 'Live demo' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/register', label: 'Create account' },
      { href: '/login', label: 'Sign in' },
      { href: '/demo', label: 'Try demo' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-navy-900 text-slate-300">
      <LandingShell className="py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <ClinicLogo inverted />
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
              CareFlow helps clinics manage patients, appointments, clinical documentation, inventory, and team access
              — all in one modern workspace.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-400 transition hover:text-brand-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Legal</h3>
            <LandingLegalLinks />
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © 2026 CareFlow. All rights reserved.</p>
          <p>Built for outpatient clinics and multi-location healthcare groups.</p>
        </div>
      </LandingShell>
    </footer>
  );
}
