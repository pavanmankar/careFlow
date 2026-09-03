import Link from 'next/link';
import { ClinicLogo } from '@/components/clinic-logo';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <ClinicLogo compact />
          </Link>
          <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
