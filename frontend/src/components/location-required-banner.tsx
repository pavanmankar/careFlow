'use client';

import { MapPin } from 'lucide-react';
import { PortalLink } from '@/components/portal-navigation';

export function LocationRequiredBanner({ canManageLocations }: { canManageLocations?: boolean }) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:px-5">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold">Location required</p>
          <p className="mt-1 text-amber-900/80">
            Add a clinic location before you can manage the calendar and appointments.
          </p>
          {canManageLocations ? (
            <PortalLink
              href="/business/locations"
              className="mt-3 inline-flex text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Go to Business → Locations
            </PortalLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
