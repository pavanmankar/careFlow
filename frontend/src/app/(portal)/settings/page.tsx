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

export default function SettingsPage() {
  const qc = useQueryClient();
  const [trialDays, setTrialDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api.get<{
        roles: string[];
        tenant: { name: string; status: string } | null;
        business: { name: string; businessTypeName: string } | null;
      }>('/api/v1/auth/me'),
  });
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const trial = useQuery({
    queryKey: ['platform-settings', 'subcription-trial-days'],
    queryFn: () => api.get<{ days: number }>('/api/v1/platform-settings/subcription-trial-days'),
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
                and Staff. Clinic address is in My profile.
              </p>
            </>
          )}
          <div className="border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">
            Idle sessions sign out after 15 minutes. Access to clinic records is written to an audit log.
            Use HTTPS in production.
          </div>
        </Card>

        {isSuperAdmin && (
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
        )}
      </div>
    </div>
  );
}
