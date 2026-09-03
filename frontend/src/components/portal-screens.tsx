'use client';

import { usePortalPath } from '@/components/portal-navigation';
import type { ComponentType, ReactNode } from 'react';
import DashboardPage from '@/app/(portal)/dashboard/page';
import AppointmentsPage from '@/app/(portal)/appointments/page';
import AppointmentDetailPage from '@/app/(portal)/appointments/[id]/page';
import PatientsPage from '@/app/(portal)/patients/page';
import PatientDetailPage from '@/app/(portal)/patients/[id]/page';
import DoctorsPage from '@/app/(portal)/doctors/page';
import DoctorDetailPage from '@/app/(portal)/doctors/[id]/page';
import DoctorPermissionsPage from '@/app/(portal)/doctors/permissions/page';
import DepartmentsPage from '@/app/(portal)/departments/page';
import DepartmentDetailPage from '@/app/(portal)/departments/[id]/page';
import CalendarPage from '@/app/(portal)/calendar/page';
import InventoryPage from '@/app/(portal)/inventory/page';
import MessagesPage from '@/app/(portal)/messages/page';
import NotificationsPage from '@/app/(portal)/notifications/page';
import SettingsPage from '@/app/(portal)/settings/page';
import TenantsPage from '@/app/(portal)/tenants/page';
import TenantDetailPage from '@/app/(portal)/tenants/[id]/page';
import StaffPage from '@/app/(portal)/user-management/users/page';
import StaffDetailPage from '@/app/(portal)/user-management/users/[id]/page';
import RolesPage from '@/app/(portal)/user-management/roles/page';
import RolePermissionsPage from '@/app/(portal)/user-management/roles/[id]/permissions/page';
import BusinessLocationsPage from '@/app/(portal)/business/locations/page';
import BusinessPage from '@/app/(portal)/business/page';

const exact: Record<string, ComponentType> = {
  '/dashboard': DashboardPage,
  '/appointments': AppointmentsPage,
  '/patients': PatientsPage,
  '/doctors': DoctorsPage,
  '/doctors/permissions': DoctorPermissionsPage,
  '/departments': DepartmentsPage,
  '/calendar': CalendarPage,
  '/inventory': InventoryPage,
  '/messages': MessagesPage,
  '/notifications': NotificationsPage,
  '/settings': SettingsPage,
  '/tenants': TenantsPage,
  '/user-management/users': StaffPage,
  '/user-management/roles': RolesPage,
  '/user-management': StaffPage,
  '/payments': InventoryPage,
  '/business': BusinessPage,
  '/business/locations': BusinessLocationsPage,
};

const patterns: Array<[RegExp, ComponentType]> = [
  [/^\/appointments\/[^/]+$/, AppointmentDetailPage],
  [/^\/user-management\/roles\/[^/]+\/permissions$/, RolePermissionsPage],
  [/^\/user-management\/users\/[^/]+$/, StaffDetailPage],
  [/^\/patients\/[^/]+$/, PatientDetailPage],
  [/^\/doctors\/[^/]+$/, DoctorDetailPage],
  [/^\/tenants\/[^/]+$/, TenantDetailPage],
  [/^\/departments\/[^/]+$/, DepartmentDetailPage],
];

export function resolvePortalScreen(pathname: string): ComponentType | null {
  return exact[pathname] ?? patterns.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

export function PortalScreen({ children }: { children: ReactNode }) {
  const path = usePortalPath();
  const Screen = resolvePortalScreen(path);
  if (!Screen) {
    return children;
  }
  return <Screen key={path} />;
}
