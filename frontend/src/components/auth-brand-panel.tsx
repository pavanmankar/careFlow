import { ClinicLogo } from '@/components/clinic-logo';
import { LaptopPhoneMock, MonitorMock } from '@/components/auth-devices';

export function AuthBrandPanel({ variant = 'login' }: { variant?: 'login' | 'register' }) {
  return (
    <aside className="relative hidden min-h-screen items-center justify-center bg-mint px-10 py-12 lg:flex lg:w-[48%]">
      <div className="w-full max-w-lg">
        <ClinicLogo />
        <h2 className="mt-10 text-3xl font-bold leading-tight text-navy-900">Stay on Top of Every Detail</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
          CareFlow brings patients, appointments, inventory, and daily operations into one calm workspace for your team.
        </p>
        {variant === 'register' ? <MonitorMock /> : <LaptopPhoneMock />}
      </div>
    </aside>
  );
}
