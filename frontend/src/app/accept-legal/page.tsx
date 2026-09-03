'use client';

import { LegalDocumentLink } from '@/components/legal/legal-document-link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, ApiClientError, getAccessToken, setApiBusy } from '@/lib/api';
import { resolveBranchAfterAuth, type MeWithLocations } from '@/lib/location';
import { needsLegalAcceptance } from '@/lib/legal';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '@/content/legal/legal-meta';
import { ClinicLogo } from '@/components/clinic-logo';
import { Button } from '@/components/ui/button';

export default function AcceptLegalPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setApiBusy(false);
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    async function verify() {
      try {
        const me = await api.get<MeWithLocations>('/api/v1/auth/me');
        if (cancelled) {
          return;
        }
        if (!needsLegalAcceptance(me.legal)) {
          router.replace(resolveBranchAfterAuth(me));
          return;
        }
        setChecking(false);
      } catch {
        if (!cancelled) {
          router.replace('/login');
        }
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onAccept() {
    if (!accepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(null);
    setBusy(true);
    setApiBusy(true, 'Saving acceptance');
    try {
      const me = await api.post<MeWithLocations>('/api/v1/auth/legal/accept', {
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_POLICY_VERSION,
      });
      setApiBusy(false);
      router.replace(resolveBranchAfterAuth(me));
    } catch (err) {
      setBusy(false);
      setApiBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Unable to save your acceptance. Please try again.');
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-start">
          <ClinicLogo />
        </div>
        <h1 className="text-left text-xl font-bold text-navy-900">Review updated policies</h1>
        <p className="mt-3 text-left text-sm leading-6 text-slate-600">
          Before you continue, please review and accept the current CareFlow Terms of Service and Privacy Policy.
        </p>
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            I agree to the CareFlow{' '}
            <LegalDocumentLink document="terms">Terms of Service</LegalDocumentLink> and{' '}
            <LegalDocumentLink document="privacy">Privacy Policy</LegalDocumentLink>.
          </span>
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button
          type="button"
          className="mt-6 h-12 w-full rounded-xl"
          disabled={busy}
          onClick={() => void onAccept()}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Continuing…
            </>
          ) : (
            'Continue to CareFlow'
          )}
        </Button>
      </div>
    </div>
  );
}
