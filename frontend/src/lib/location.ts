import { clearActiveLocationId, setActiveLocationId } from '@/lib/api';

export type BranchLocation = {
  id: string;
  name: string;
  code: string;
  timezone: string;
  status: string;
};

export type MeWithLocations = {
  roles: string[];
  locations?: BranchLocation[];
};

/**
 * Persist branch selection after login/register/demo and return the next route.
 * 0 locations → clear selection, dashboard
 * 1 location → auto-select, dashboard
 * 2+ → select-branch page
 */
export function resolveBranchAfterAuth(me: MeWithLocations): string {
  const locations = me.locations ?? [];
  if (me.roles?.includes('SUPER_ADMIN')) {
    clearActiveLocationId();
    return '/dashboard';
  }
  if (locations.length === 0) {
    clearActiveLocationId();
    return '/dashboard';
  }
  if (locations.length === 1) {
    setActiveLocationId(locations[0].id);
    return '/dashboard';
  }
  return '/select-branch';
}
