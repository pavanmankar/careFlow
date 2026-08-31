'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePortalId, usePortalNavigate } from '@/components/portal-navigation';
import { api, ApiClientError } from '@/lib/api';
import { formatAddress, Address } from '@/lib/address';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { BackLink } from '@/components/ui/icon-button';
import { DatePicker } from '@/components/date-range-calendar';
import { subscriptionStatusLabel } from '@/components/subscription-required';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface TenantDetail {
  id: string;
  name: string;
  status: string;
  subcriptionEnabled: boolean;
  subcriptionUntil: number | null;
  business: {
    name: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    timezone: string;
    currency: string;
    country: string | null;
    address: Address | null;
    businessType: { name: string };
  } | null;
  addresses: Array<{
    source: string;
    name: string;
    phone: string | null;
    address: Address | null;
  }>;
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    roles: Array<{ name: string }>;
  }>;
}

interface Me {
  roles: string[];
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

function dateInputValue(ms: number | null) {
  if (ms == null) {
    return '';
  }
  return new Date(ms).toISOString().slice(0, 10);
}

function endOfUtcDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
}

export default function TenantDetailPage() {
  const params = { id: usePortalId() };
  const navigate = usePortalNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [subUntil, setSubUntil] = useState('');
  const [subError, setSubError] = useState<string | null>(null);
  const subscriptionCardRef = useRef<HTMLDivElement>(null);
  const [pairHeight, setPairHeight] = useState<number | null>(null);

  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const tenant = useQuery({
    queryKey: ['tenants', params.id],
    queryFn: () => api.get<TenantDetail>(`/api/v1/tenants/${params.id}`),
    enabled: isSuperAdmin && Boolean(params.id),
  });

  useEffect(() => {
    if (me.isSuccess && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [me.isSuccess, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!tenant.data) {
      return;
    }
    setSubEnabled(tenant.data.subcriptionEnabled);
    setSubUntil(dateInputValue(tenant.data.subcriptionUntil));
  }, [tenant.data]);

  const toggle = useMutation({
    mutationFn: () =>
      api.post(
        `/api/v1/tenants/${params.id}/${tenant.data?.status === 'ACTIVE' ? 'deactivate' : 'activate'}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setConfirmOpen(false);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to update workspace'),
  });

  const saveSubscription = useMutation({
    mutationFn: () =>
      api.patch(`/api/v1/tenants/${params.id}/subscription`, {
        subcriptionEnabled: subEnabled,
        subcriptionUntil: subUntil ? endOfUtcDay(subUntil) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setSubError(null);
    },
    onError: (err) => setSubError(err instanceof ApiClientError ? err.message : 'Unable to update subscription'),
  });

  const data = tenant.data;
  const business = data?.business;
  const isActive = data?.status === 'ACTIVE';
  const subscription = data
    ? subscriptionStatusLabel({
        subcriptionEnabled: data.subcriptionEnabled,
        subcriptionUntil: data.subcriptionUntil,
      })
    : null;

  useLayoutEffect(() => {
    const node = subscriptionCardRef.current;
    if (!node) {
      return;
    }
    const sync = () => setPairHeight(node.getBoundingClientRect().height);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [data, subEnabled, subUntil, subError, subscription]);

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <BackLink
          href="/tenants"
          label={business?.name ?? data?.name ?? 'Clinic'}
          heading
        >
          {data && <StatusBadge status={data.status} />}
        </BackLink>
        {data && (
          <Button variant={isActive ? 'danger' : 'primary'} onClick={() => setConfirmOpen(true)}>
            {isActive ? 'Deactivate' : 'Activate'}
          </Button>
        )}
      </div>
      {error && <p className="-mt-2 mb-4 text-sm text-red-600">{error}</p>}

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Business name" value={business?.name} />
          <Detail label="Legal name" value={business?.legalName} />
          <Detail label="Type of clinic" value={business?.businessType.name} />
          <Detail label="Email" value={business?.email} />
          <Detail label="Phone" value={business?.phone} />
          <Detail label="Website" value={business?.website} />
          <Detail label="Timezone" value={business?.timezone} />
          <Detail label="Currency" value={business?.currency} />
        </dl>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div ref={subscriptionCardRef}>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Subscription</h2>
              {subscription && (
                <span className="text-sm text-slate-600">
                  {subscription.label}
                  {subscription.tone === 'active' && data?.subcriptionUntil != null
                    ? ` until ${formatUtcMillis(data.subcriptionUntil)}`
                    : ''}
                </span>
              )}
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveSubscription.mutate();
              }}
            >
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={subEnabled}
                  onChange={(event) => setSubEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Appointments &amp; Calendar access enabled
              </label>
              <div>
                <Label>Access end date</Label>
                <DatePicker
                  value={subUntil || null}
                  onChange={(next) => setSubUntil(next ?? '')}
                  placeholder="Select end date"
                  allowClear
                />
                <p className="mt-1 text-xs text-slate-400">Access is allowed before the end of this UTC day.</p>
              </div>
              {subError && <p className="text-sm text-red-600">{subError}</p>}
              <Button type="submit" disabled={saveSubscription.isPending || !data}>
                {saveSubscription.isPending ? 'Saving…' : 'Save subscription'}
              </Button>
            </form>
          </Card>
        </div>

        <Card
          className="flex min-h-0 flex-col overflow-hidden"
          style={pairHeight ? { height: pairHeight } : undefined}
        >
          <h2 className="mb-4 shrink-0 text-sm font-semibold uppercase tracking-wide text-slate-500">Address</h2>
          {data?.addresses.length ? (
            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {data.addresses.map((row, index) => (
                <li key={`${row.source}-${row.name}-${index}`} className="text-sm text-slate-800">
                  <div className="font-medium">{row.name}</div>
                  <div className="mt-1 text-slate-600">{formatAddress(row.address) || '—'}</div>
                  {row.phone && <div className="mt-1 text-slate-500">{row.phone}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No address has been saved for this business yet.</p>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Employees</h2>
        <DataTable loading={tenant.isLoading}>
        <TableHead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
          </tr>
        </TableHead>
        <tbody>
          {data?.employees.map((user) => (
            <Tr key={user.id}>
              <Td className="font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </Td>
              <Td>{user.email}</Td>
              <Td>{user.roles.map((r) => r.name).join(', ') || '—'}</Td>
              <Td>
                <StatusBadge status={user.status} />
              </Td>
            </Tr>
          ))}
          {data && data.employees.length === 0 && (
            <tr>
              <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                No employees in this workspace.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      </div>

      <Modal
        open={confirmOpen}
        title={isActive ? 'Deactivate workspace' : 'Activate workspace'}
        onClose={() => setConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={isActive ? 'danger' : 'primary'}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate()}
            >
              {toggle.isPending ? 'Updating…' : isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {isActive
            ? 'Users in this workspace will not be able to sign in until it is activated again. Individually deactivated staff stay inactive.'
            : 'This workspace and its business will be marked active. Users can sign in again if their accounts are active.'}
        </p>
      </Modal>
    </div>
  );
}
