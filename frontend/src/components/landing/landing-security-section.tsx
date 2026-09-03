import { LandingShell } from '@/components/landing/landing-shell';
import {
  Building2,
  Fingerprint,
  KeyRound,
  Lock,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';

const safeguards = [
  {
    icon: Fingerprint,
    title: 'Two-factor authentication',
    description:
      'Optional TOTP authenticator apps for clinic users. Owners can require MFA clinic-wide; admins can reset lost devices with a full audit trail.',
  },
  {
    icon: KeyRound,
    title: 'Roles & permissions',
    description:
      'Granular access for reception, doctors, and owners. Configure a shared doctor permission set per branch and custom staff roles without code changes.',
  },
  {
    icon: Building2,
    title: 'Tenant & branch isolation',
    description:
      'Each clinic workspace is isolated. Staff only see patients, appointments, and inventory for their active branch unless their role allows more.',
  },
  {
    icon: Lock,
    title: 'Secure sign-in',
    description:
      'Argon2 password hashing, short-lived access tokens, httpOnly refresh cookies, session timeout, and rate limiting on authentication endpoints.',
  },
  {
    icon: ScrollText,
    title: 'Audit logging',
    description:
      'Security-sensitive actions — sign-in events, MFA resets, role changes, and permission updates — are recorded for accountability without storing clinical content.',
  },
  {
    icon: ShieldCheck,
    title: 'HIPAA-aligned design',
    description:
      'Built with healthcare privacy in mind: minimum-necessary access, BAA-ready terms, and safeguards described in our Privacy Policy. Formal certification is your organization’s responsibility.',
  },
];

export function LandingSecuritySection() {
  return (
    <section id="security" className="w-full border-y border-slate-200/70 bg-white py-14 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">Security</p>
          <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">
            Healthcare-grade access controls from day one
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            CareFlow helps clinics protect patient data with layered authentication, role-based permissions, and
            tenant isolation — so every team member sees only what they need.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {safeguards.map((item) => (
            <article
              key={item.title}
              className="group rounded-2xl border border-slate-200/80 bg-canvas/40 p-5 transition hover:border-brand-200 hover:bg-white hover:shadow-[0_12px_40px_rgba(15,39,68,0.06)] sm:p-6"
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
