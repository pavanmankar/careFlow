'use client';

import { AppShell } from '@/components/app-shell';
import { PortalNavProvider } from '@/components/portal-navigation';
import { PortalScreen } from '@/components/portal-screens';
import { api, getAccessToken, getActiveLocationId, setActiveLocationId, setApiBusy } from '@/lib/api';
import type { MeWithLocations } from '@/lib/location';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function gate() {
      if (!getAccessToken()) {
        router.replace('/login');
        return;
      }
      try {
        const me = await api.get<MeWithLocations>('/api/v1/auth/me');
        if (cancelled) {
          return;
        }
        const isSuperAdmin = me.roles?.includes('SUPER_ADMIN');
        const locations = me.locations ?? [];
        if (!isSuperAdmin && locations.length >= 2 && !getActiveLocationId()) {
          router.replace('/select-branch');
          return;
        }
        if (!isSuperAdmin && locations.length === 1 && !getActiveLocationId()) {
          setActiveLocationId(locations[0].id);
        }
        setReady(true);
        setApiBusy(false);
      } catch {
        if (!cancelled) {
          router.replace('/login');
        }
      }
    }
    void gate();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <PortalNavProvider>
      <AppShell>
        <PortalScreen>{children}</PortalScreen>
      </AppShell>
    </PortalNavProvider>
  );
}
