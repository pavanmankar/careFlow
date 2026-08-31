import Link from 'next/link';
import { LandingShell } from '@/components/landing/landing-shell';
import { ArrowRight } from 'lucide-react';

export function LandingCtaBanner() {
  return (
    <section className="w-full bg-canvas py-14 sm:py-16">
      <LandingShell>
        <div className="flex w-full flex-col items-center rounded-[2rem] border border-brand-100 bg-gradient-to-r from-mint via-white to-mint px-6 py-12 text-center shadow-[0_20px_60px_rgba(79,160,171,0.12)] sm:px-10 sm:py-14">
          <h2 className="max-w-2xl text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">
            Ready to simplify clinic operations?
          </h2>
          <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
            Join clinics that run scheduling, documentation, and inventory on one platform — start with the demo or
            create your workspace today.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-brand-600"
            >
              Create your clinic
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-navy-900 hover:bg-slate-50"
            >
              Try live demo
            </Link>
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
