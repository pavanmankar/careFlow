'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api, ApiClientError, setAccessToken } from '@/lib/api';
import { PUBLIC_DEMO } from '@/lib/demo';
import { resolveBranchAfterAuth, type MeWithLocations } from '@/lib/location';
import { ClinicLogo } from '@/components/clinic-logo';

export default function DemoLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function enterDemo() {
      try {
        const data = await api.post<{ accessToken: string }>('/api/v1/auth/login', {
          email: PUBLIC_DEMO.email,
          password: PUBLIC_DEMO.password,
        });
        if (cancelled) {
          return;
        }
        setAccessToken(data.accessToken);
        const me = await api.get<MeWithLocations>('/api/v1/auth/me');
        router.replace(resolveBranchAfterAuth(me));
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Unable to start demo. Ask your administrator to run db:seed:public-demo.',
        );
      }
    }

    void enterDemo();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <ClinicLogo />
      <div className="mt-8 flex flex-col items-center text-center">
        {error ? (
          <>
            <p className="max-w-md text-sm text-red-600">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link href="/" className="font-medium text-brand-600 hover:text-brand-700">
                Back to home
              </Link>
              <Link href="/login" className="font-medium text-slate-600 hover:text-navy-900">
                Sign in manually
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-4 text-sm text-slate-600">Opening {PUBLIC_DEMO.clinicName} demo…</p>
          </>
        )}
      </div>
    </div>
  );
}
