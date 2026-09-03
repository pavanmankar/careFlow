import { clearActiveLocationId, setActiveLocationId } from '@/lib/api';
import type { LegalConsentStatus } from '@/lib/legal';
import { needsLegalAcceptance } from '@/lib/legal';
import { resolveDefaultPortalRoute } from '@/lib/portal-routes';

export type BranchLocation = {
  id: string;
  name: string;
  code: string;
  timezone: string;
  status: string;
};

export type MeWithLocations = {
  roles: string[];
  permissions?: string[];
  locations?: BranchLocation[];
  legal?: LegalConsentStatus;
};

/**
 * Persist branch selection after login/register/demo and return the next route.
 * 0 locations → clear selection, default portal route
 * 1 location → auto-select, default portal route
 * 2+ → select-branch page
 */
export function resolveBranchAfterAuth(me: MeWithLocations): string {
  if (needsLegalAcceptance(me.legal)) {
    return '/accept-legal';
  }
  const landingRoute = resolveDefaultPortalRoute(me);
  const locations = me.locations ?? [];
  if (me.roles?.includes('SUPER_ADMIN')) {
    clearActiveLocationId();
    return landingRoute;
  }
  if (locations.length === 0) {
    clearActiveLocationId();
    return landingRoute;
  }
  if (locations.length === 1) {
    setActiveLocationId(locations[0].id);
    return landingRoute;
  }
  return '/select-branch';
}
