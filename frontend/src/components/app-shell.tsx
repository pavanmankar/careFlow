'use client';

import {
  Building2,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Shield,
  Stethoscope,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { UserMenu } from '@/components/user-menu';
import { ClinicLogo } from '@/components/clinic-logo';
import { SessionTimeout } from '@/components/session-timeout';
import { PortalLink, usePortalNavigate, usePortalPath } from '@/components/portal-navigation';
import { BranchSwitcher } from '@/components/branch-switcher';
import {
  AppointmentsEntitlement,
  SubscriptionRequiredModal,
} from '@/components/subscription-required';
import { cn } from '@/lib/cn';
import { isDemoViewer } from '@/lib/demo';

interface Me {
  user: { firstName: string; lastName: string };
  business: { name: string } | null;
  permissions: string[];
  roles: string[];
  entitlements?: {
    appointments: AppointmentsEntitlement;
  };
}

function headerCopy(pathname: string, firstName: string) {
  if (pathname.startsWith('/dashboard')) {
    return {
      title: firstName ? `Hello ${firstName}, welcome back!` : 'Dashboard',
      subtitle: firstName ? 'Here is your overview for today.' : undefined,
    };
  }
  if (pathname.includes('/permissions')) {
    return { title: 'Permissions' };
  }
  const routes: Array<[string, string]> = [
    ['/user-management/users', 'Staff'],
    ['/user-management/roles', 'Roles'],
    ['/user-management', 'User Management'],
    ['/appointments', 'Appointments'],
    ['/patients', 'Patients'],
    ['/doctors', 'Doctors'],
    ['/departments', 'Departments'],
    ['/calendar', 'Calendar'],
    ['/inventory', 'Inventory'],
    ['/messages', 'Messages'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
    ['/tenants', 'Clinics'],
    ['/payments', 'Payments'],
  ];
  const match = routes.find(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  return { title: match?.[1] ?? '' };
}

function navClass(active: boolean, nested?: boolean) {
  return cn(
    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
    nested && 'py-2',
    active ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-navy-900',
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  nested = false,
  blocked = false,
  onBlocked,
}: {
  href: string;
  label: string;
  icon: typeof Users;
  pathname: string;
  nested?: boolean;
  blocked?: boolean;
  onBlocked?: () => void;
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
  if (blocked) {
    return (
      <button type="button" onClick={onBlocked} className={navClass(active, nested)}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </button>
    );
  }
  return (
    <PortalLink href={href} className={navClass(active, nested)}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </PortalLink>
  );
}

function isAppointmentsPath(pathname: string) {
  return pathname === '/appointments' || pathname.startsWith('/appointments/') || pathname === '/calendar';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePortalPath();
  const navigate = usePortalNavigate();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/api/v1/auth/me'),
  });
  const permissions = me.data?.permissions ?? [];
  const roles = me.data?.roles ?? [];
  const can = (code: string) => permissions.includes(code);
  const demoMode = isDemoViewer(permissions, roles);
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const appointmentsAllowed = me.data?.entitlements?.appointments.allowed ?? true;
  const showUserManagement = !isSuperAdmin && (can('STAFF_READ') || can('ROLE_READ'));
  const [userMgmtOpen, setUserMgmtOpen] = useState(pathname.startsWith('/user-management'));
  const [navOpen, setNavOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const firstName = me.data?.user.firstName ?? '';
  const copy = headerCopy(pathname, firstName);
  const blockedModulePath = !isSuperAdmin && me.isSuccess && !appointmentsAllowed && isAppointmentsPath(pathname);

  useEffect(() => {
    if (pathname.startsWith('/user-management')) {
      setUserMgmtOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (blockedModulePath) {
      setSubscriptionOpen(true);
    }
  }, [blockedModulePath]);

  function closeSubscriptionModal() {
    setSubscriptionOpen(false);
    if (blockedModulePath) {
      navigate('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SessionTimeout />
      {demoMode ? (
        <div className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-center text-sm text-brand-900 md:px-6">
          Demo mode — view only.{' '}
          <a href="/register" className="font-semibold underline underline-offset-2 hover:text-brand-700">
            Sign up
          </a>{' '}
          to manage your own clinic.
        </div>
      ) : null}
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 md:gap-4 md:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-navy-900 lg:hidden"
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
        >
          {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <ClinicLogo compact />
        <BranchSwitcher />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-navy-900 md:text-lg">{copy.title}</h1>
          {copy.subtitle && <p className="truncate text-xs text-slate-500">{copy.subtitle}</p>}
        </div>
        <UserMenu />
      </header>
      <div className="relative flex min-h-0 flex-1">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-navy-900/40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        ) : null}
        <aside
          className={cn(
            'z-30 flex w-[260px] shrink-0 flex-col bg-white transition-transform',
            'fixed inset-y-[72px] left-0 lg:static lg:inset-auto lg:translate-x-0',
            navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} pathname={pathname} />
            {isSuperAdmin && <NavLink href="/tenants" label="Clinics" icon={Building2} pathname={pathname} />}
            {isSuperAdmin && <NavLink href="/settings" label="Settings" icon={Settings} pathname={pathname} />}
            {!isSuperAdmin && (
              <>
                {can('APPOINTMENT_READ') && (
                  <NavLink
                    href="/appointments"
                    label="Appointments"
                    icon={CalendarDays}
                    pathname={pathname}
                    blocked={!appointmentsAllowed}
                    onBlocked={() => setSubscriptionOpen(true)}
                  />
                )}
                {can('PATIENT_READ') && <NavLink href="/patients" label="Patients" icon={UserRound} pathname={pathname} />}
                {can('DOCTOR_READ') && <NavLink href="/doctors" label="Doctors" icon={Stethoscope} pathname={pathname} />}
                {can('APPOINTMENT_READ') && (
                  <NavLink
                    href="/calendar"
                    label="Calendar"
                    icon={CalendarDays}
                    pathname={pathname}
                    blocked={!appointmentsAllowed}
                    onBlocked={() => setSubscriptionOpen(true)}
                  />
                )}
                {can('INVENTORY_READ') && <NavLink href="/inventory" label="Inventory" icon={Package} pathname={pathname} />}
                {can('LOCATION_READ') && (
                  <NavLink href="/business/locations" label="Locations" icon={Building2} pathname={pathname} />
                )}
              </>
            )}
            {showUserManagement && (
              <div>
                <button
                  type="button"
                  onClick={() => setUserMgmtOpen((open) => !open)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                    pathname.startsWith('/user-management')
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-navy-900',
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span className="flex-1 text-left">User Management</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', userMgmtOpen && 'rotate-180')} />
                </button>
                {userMgmtOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {can('STAFF_READ') && (
                      <NavLink href="/user-management/users" label="Staff" icon={Users} pathname={pathname} nested />
                    )}
                    {can('ROLE_READ') && (
                      <NavLink href="/user-management/roles" label="Roles" icon={Shield} pathname={pathname} nested />
                    )}
                  </div>
                )}
              </div>
            )}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto px-4 py-4 sm:px-6 md:px-8 md:py-6">
          {blockedModulePath ? null : children}
        </main>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500 md:px-6">
        <span>Copyright © 2026 CareFlow</span>
        <nav className="flex gap-4">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </nav>
      </footer>
      <SubscriptionRequiredModal open={subscriptionOpen} onClose={closeSubscriptionModal} />
    </div>
  );
}
