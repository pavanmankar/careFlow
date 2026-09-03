'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api, ApiClientError, setAccessToken, setApiBusy } from '@/lib/api';
import { resolveBranchAfterAuth, type MeWithLocations } from '@/lib/location';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClinicLogo } from '@/components/clinic-logo';
import { AuthBrandPanel } from '@/components/auth-brand-panel';

const fieldClass =
  'h-12 rounded-xl border-0 bg-[#F3F4F6] px-4 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

function MfaEnrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollToken = searchParams.get('token') ?? '';
  const [step, setStep] = useState<'loading' | 'scan' | 'backup' | 'error'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setApiBusy(false);
    if (!enrollToken) {
      setStep('error');
      setError('Enrollment link is invalid or expired. Sign in again.');
      return;
    }
    let cancelled = false;
    async function start() {
      try {
        const data = await api.post<{ qrDataUrl: string; manualSecret: string }>('/api/v1/auth/mfa/enroll/start', {
          enrollToken,
        });
        if (cancelled) {
          return;
        }
        setQrDataUrl(data.qrDataUrl);
        setManualSecret(data.manualSecret);
        setStep('scan');
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStep('error');
        setError(err instanceof ApiClientError ? err.message : 'Unable to start MFA enrollment');
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [enrollToken]);

  async function onConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setApiBusy(true, 'Enabling MFA');
    try {
      const data = await api.post<{ accessToken: string; backupCodes: string[] }>(
        '/api/v1/auth/mfa/enroll/confirm',
        { enrollToken, code },
      );
      setAccessToken(data.accessToken);
      setBackupCodes(data.backupCodes);
      setStep('backup');
      setApiBusy(false);
      setBusy(false);
    } catch (err) {
      setBusy(false);
      setApiBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Invalid authentication code');
    }
  }

  async function onContinue() {
    const me = await api.get<MeWithLocations>('/api/v1/auth/me');
    router.replace(resolveBranchAfterAuth(me));
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel variant="login" />
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <ClinicLogo />
          </div>
          <h1 className="text-center text-[26px] font-bold leading-tight text-navy-900">Set up authenticator</h1>
          {step === 'loading' && (
            <p className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your QR code…
            </p>
          )}
          {step === 'error' && (
            <p className="mt-6 text-center text-sm text-red-600">{error}</p>
          )}
          {step === 'scan' && (
            <div className="mt-8 space-y-5">
              <p className="text-center text-sm text-slate-500">
                Scan this QR code with Google Authenticator, Microsoft Authenticator, or a compatible app.
              </p>
              {qrDataUrl && (
                <div className="flex justify-center">
                  <img src={qrDataUrl} alt="MFA QR code" className="h-48 w-48 rounded-xl border border-slate-100" />
                </div>
              )}
              {manualSecret && (
                <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-600">
                  <div className="font-medium uppercase tracking-wide text-slate-400">Manual entry key</div>
                  <div className="mt-2 break-all font-mono text-sm text-navy-900">{manualSecret}</div>
                </div>
              )}
              <form className="space-y-4" onSubmit={onConfirm}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Verification code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className={fieldClass}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-brand-600"
                  disabled={busy || code.trim().length < 6}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    'Enable MFA'
                  )}
                </Button>
              </form>
            </div>
          )}
          {step === 'backup' && (
            <div className="mt-8 space-y-5">
              <p className="text-center text-sm text-slate-500">
                Save these backup codes in a secure place. Each code can be used once if you lose access to your
                authenticator app.
              </p>
              <div className="rounded-xl bg-slate-50 p-4 font-mono text-sm text-navy-900">
                {backupCodes.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-brand-600"
                onClick={() => void onContinue()}
              >
                Continue to dashboard
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MfaEnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading…
        </div>
      }
    >
      <MfaEnrollContent />
    </Suspense>
  );
}
