'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, MapPin } from 'lucide-react';
import { api, ApiClientError, getAccessToken, setActiveLocationId, setApiBusy } from '@/lib/api';
import { ClinicLogo } from '@/components/clinic-logo';
import type { BranchLocation, MeWithLocations } from '@/lib/location';
import { resolveBranchAfterAuth } from '@/lib/location';
import { resolveDefaultPortalRoute } from '@/lib/portal-routes';
import { needsLegalAcceptance } from '@/lib/legal';

export default function SelectBranchPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setApiBusy(false);
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const me = await api.get<MeWithLocations>('/api/v1/auth/me');
        if (cancelled) {
          return;
        }
        if (needsLegalAcceptance(me.legal)) {
          router.replace('/accept-legal');
          return;
        }
        if (me.roles?.includes('SUPER_ADMIN')) {
          router.replace('/dashboard');
          return;
        }
        const list = me.locations ?? [];
        if (list.length < 2) {
          router.replace(resolveBranchAfterAuth(me));
          return;
        }
        setLocations(list);
        setPermissions(me.permissions ?? []);
        setRoles(me.roles ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load branches.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function selectBranch(id: string) {
    setActiveLocationId(id);
    router.replace(resolveDefaultPortalRoute({ roles, permissions }));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <ClinicLogo />
      <div className="mt-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-brand-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-navy-900">Select a branch</h1>
            <p className="text-sm text-slate-500">Choose which clinic location you want to work in today.</p>
          </div>
        </div>
        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading branches…
          </div>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {locations.map((loc) => (
              <li key={loc.id}>
                <button
                  type="button"
                  onClick={() => selectBranch(loc.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-mint/40"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <div className="font-semibold text-navy-900">{loc.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {loc.code} · {loc.timezone}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
