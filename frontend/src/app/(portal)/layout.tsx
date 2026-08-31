'use client';

import { AppShell } from '@/components/app-shell';
import { PortalNavProvider } from '@/components/portal-navigation';
import { PortalScreen } from '@/components/portal-screens';
import { getAccessToken, setApiBusy } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
    setApiBusy(false);
  }, [router]);

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
