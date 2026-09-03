'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { useState } from 'react';

type MeResponse = {
  roles: string[];
  mfa?: { enabled: boolean; required: boolean; platformEnabled: boolean };
  tenant: { name: string; status: string } | null;
  business: { name: string; businessTypeName: string } | null;
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [trialDays, setTrialDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mfaSaved, setMfaSaved] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/api/v1/auth/me'),
  });
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const trial = useQuery({
    queryKey: ['platform-settings', 'subcription-trial-days'],
    queryFn: () => api.get<{ days: number }>('/api/v1/platform-settings/subcription-trial-days'),
    enabled: isSuperAdmin,
  });
  const platformMfa = useQuery({
    queryKey: ['platform-settings', 'mfa-authentication-enabled'],
    queryFn: () => api.get<{ enabled: boolean }>('/api/v1/platform-settings/mfa-authentication-enabled'),
    enabled: isSuperAdmin,
  });

  const saveTrial = useMutation({
    mutationFn: (days: number) => api.put('/api/v1/platform-settings/subcription-trial-days', { days }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'subcription-trial-days'] });
      setError(null);
      setSaved(true);
    },
    onError: (err) => {
      setSaved(false);
      setError(err instanceof ApiClientError ? err.message : 'Unable to save trial days');
    },
  });

  const saveMfaSetting = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put('/api/v1/platform-settings/mfa-authentication-enabled', { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings', 'mfa-authentication-enabled'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      setMfaError(null);
      setMfaSaved(true);
    },
    onError: (err) => {
      setMfaSaved(false);
      setMfaError(err instanceof ApiClientError ? err.message : 'Unable to save MFA setting');
    },
  });

  const regenerateBackupCodes = useMutation({
    mutationFn: (password: string) =>
      api.post<{ backupCodes: string[] }>('/api/v1/auth/mfa/backup-codes/regenerate', { password }),
    onSuccess: (data) => {
      setRegenCodes(data.backupCodes);
      setRegenError(null);
      setRegenPassword('');
    },
    onError: (err) => {
      setRegenCodes(null);
      setRegenError(err instanceof ApiClientError ? err.message : 'Unable to regenerate backup codes');
    },
  });

  const mfaEnabled = me.data?.mfa?.enabled ?? false;
  const mfaRequired = me.data?.mfa?.required ?? false;
  const platformMfaEnabled = me.data?.mfa?.platformEnabled ?? false;

  return (
    <div>
      <PageHeader description="Workspace and account preferences." />
      <div className="space-y-4">
        <Card className="max-w-xl space-y-4">
          {isSuperAdmin ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Account</div>
              <div className="mt-1 font-medium text-navy-900">Platform administrator</div>
              <p className="mt-2 text-sm text-slate-500">
                Review registered clinics from Clinics. Clinic settings belong to each owner.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinic</div>
                <div className="mt-1 font-medium text-navy-900">{me.data?.tenant?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Name of clinic</div>
                <div className="mt-1 text-slate-800">{me.data?.business?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Type of clinic</div>
                <div className="mt-1 text-slate-800">{me.data?.business?.businessTypeName ?? '—'}</div>
              </div>
              <p className="text-sm text-slate-500">
                Manage people from{' '}
                <Link className="font-medium text-brand-600 hover:text-brand-800" href="/user-management/roles">
                  Roles
                </Link>{' '}
                and Staff.
              </p>
            </>
          )}
          <div className="border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">
            Idle sessions sign out after 15 minutes. Access to clinic records is written to an audit log.
            Use HTTPS in production.
          </div>
        </Card>

        {isSuperAdmin && (
          <>
            <Card className="max-w-xl space-y-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Appointments trial
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Default free-trial length for new clinics. Existing clinics are unchanged when you update this.
                </p>
              </div>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const days = Number(trialDays || trial.data?.days || 30);
                  saveTrial.mutate(days);
                }}
              >
                <div>
                  <Label>Trial days</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={trialDays || (trial.data?.days != null ? String(trial.data.days) : '')}
                    onChange={(event) => {
                      setTrialDays(event.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}
                <Button type="submit" disabled={saveTrial.isPending || trial.isLoading}>
                  {saveTrial.isPending ? 'Saving…' : 'Save trial days'}
                </Button>
              </form>
            </Card>

            <Card className="max-w-xl space-y-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Multi-factor authentication
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Require MFA for all clinic users (owners, staff, doctors, and demo users). Super Admin accounts are
                  never prompted for MFA. You can turn MFA off for a specific clinic from its detail page.
                </p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={platformMfa.data?.enabled ?? false}
                  disabled={platformMfa.isLoading || saveMfaSetting.isPending}
                  onChange={(event) => {
                    setMfaSaved(false);
                    saveMfaSetting.mutate(event.target.checked);
                  }}
                />
                Require MFA for all clinic users
              </label>
              {mfaError && <p className="text-sm text-red-600">{mfaError}</p>}
              {mfaSaved && !mfaError && <p className="text-sm text-emerald-600">Saved.</p>}
            </Card>
          </>
        )}

        {!isSuperAdmin && (
          <Card className="max-w-xl space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Security</h2>
              {!platformMfaEnabled ? (
                <p className="mt-2 text-sm text-slate-500">MFA is not required by your platform administrator.</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Status:{' '}
                  <span className="font-medium text-navy-900">
                    {mfaEnabled ? 'Enabled' : mfaRequired ? 'Enrollment required on next sign-in' : 'Not enrolled'}
                  </span>
                </p>
              )}
            </div>
            {platformMfaEnabled && mfaEnabled && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  regenerateBackupCodes.mutate(regenPassword);
                }}
              >
                <div>
                  <Label>Password to regenerate backup codes</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={regenPassword}
                    onChange={(event) => setRegenPassword(event.target.value)}
                  />
                </div>
                {regenError && <p className="text-sm text-red-600">{regenError}</p>}
                {regenCodes && (
                  <div className="rounded-xl bg-slate-50 p-4 font-mono text-sm text-navy-900">
                    {regenCodes.map((code) => (
                      <div key={code}>{code}</div>
                    ))}
                  </div>
                )}
                <Button type="submit" disabled={regenerateBackupCodes.isPending || !regenPassword}>
                  {regenerateBackupCodes.isPending ? 'Regenerating…' : 'Regenerate backup codes'}
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
