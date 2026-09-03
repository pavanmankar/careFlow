const PORTAL_LANDING_ROUTES = [
  { permission: 'DASHBOARD_READ', href: '/dashboard' },
  { permission: 'APPOINTMENT_READ', href: '/appointments' },
  { permission: 'PATIENT_READ', href: '/patients' },
  { permission: 'DOCTOR_READ', href: '/doctors' },
  { permission: 'INVENTORY_READ', href: '/inventory' },
  { permission: 'LOCATION_READ', href: '/business/locations' },
  { permission: 'STAFF_READ', href: '/user-management/users' },
  { permission: 'ROLE_READ', href: '/user-management/roles' },
] as const;

type PortalMe = {
  roles?: string[];
  permissions?: string[];
};

export function resolveDefaultPortalRoute(me: PortalMe): string {
  if (me.roles?.includes('SUPER_ADMIN')) {
    return '/dashboard';
  }
  const permissions = me.permissions ?? [];
  const match = PORTAL_LANDING_ROUTES.find((route) => permissions.includes(route.permission));
  return match?.href ?? '/dashboard';
}

export function canViewDashboard(me: PortalMe): boolean {
  return me.roles?.includes('SUPER_ADMIN') || (me.permissions?.includes('DASHBOARD_READ') ?? false);
}
