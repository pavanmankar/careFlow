'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { usePortalId } from '@/components/portal-navigation';
import { useEffect, useState } from 'react';
import { api, ApiClientError, getActiveLocationId } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressFields } from '@/components/address-fields';
import { type Address } from '@/lib/address';
import { Select } from '@/components/ui/select';
import { BackLink } from '@/components/ui/icon-button';
import { StaffAvatar } from '@/components/staff-avatar';
import { Modal } from '@/components/ui/modal';

interface Role {
  id: string;
  name: string;
  code?: string;
}

interface StaffDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  timezone: string | null;
  status: string;
  createdAt: number;
  lastLoginAt: number | null;
  address: Address | null;
  mfaEnabled: boolean;
  roles: Role[];
}

interface Me {
  user: { id: string };
  permissions: string[];
  roles: string[];
}

type StaffForm = {
  firstName: string;
  lastName: string;
  phone: string;
  roleIds: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function StaffDetailPage() {
  const params = { id: usePortalId() };
  const locationId = getActiveLocationId();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mfaResetOpen, setMfaResetOpen] = useState(false);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const staff = useQuery({
    queryKey: ['users', locationId, params.id],
    queryFn: () => api.get<StaffDetail>(`/api/v1/users/${params.id}`),
    enabled: Boolean(params.id),
  });
  const roles = useQuery({
    queryKey: ['roles', locationId, 'assignable'],
    queryFn: () => api.get<{ items: Role[] }>('/api/v1/roles?assignable=true'),
  });
  const form = useForm<StaffForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      roleIds: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });
  const permissions = me.data?.permissions ?? [];
  const can = (code: string) => permissions.includes(code);
  const user = staff.data;
  const isSelf = Boolean(me.data?.user.id && me.data.user.id === params.id);
  const isOwner = me.data?.roles.includes('TENANT_OWNER') ?? false;
  const isTargetOwner = Boolean(user?.roles.some((role) => role.code === 'TENANT_OWNER'));
  const canResetMfa = isOwner && !isSelf && !isTargetOwner && Boolean(user?.mfaEnabled);
  const canEdit = can('STAFF_UPDATE') && !isSelf;

  useEffect(() => {
    if (!user) {
      return;
    }
    const address = user.address ?? {};
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      roleIds: user.roles[0]?.id ?? '',
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      postalCode: address.postalCode ?? '',
      country: address.country ?? '',
    });
  }, [user, form]);

  const save = useMutation({
    mutationFn: async (values: StaffForm) => {
      await api.put(`/api/v1/users/${params.id}`, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || null,
        address: {
          line1: values.line1 || undefined,
          line2: values.line2 || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          postalCode: values.postalCode || undefined,
          country: values.country || undefined,
        },
      });
      if (can('USER_ASSIGN_ROLE') && values.roleIds) {
        await api.put(`/api/v1/users/${params.id}/roles`, { roleIds: [values.roleIds] });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', params.id] });
      setMessage('Staff details saved');
      setError(null);
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiClientError ? err.message : 'Unable to save staff');
    },
  });

  const resetMfa = useMutation({
    mutationFn: () => api.post(`/api/v1/users/${params.id}/mfa-reset`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', locationId, params.id] });
      setMfaResetOpen(false);
      setMessage('Two-factor authentication was reset. This user must set up their authenticator again on next sign-in.');
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Unable to reset two-factor authentication');
    },
  });

  return (
    <div>
      <BackLink
        href="/user-management/users"
        label={user ? `${user.firstName} ${user.lastName}` : 'Staff'}
        heading
      >
        {user && (
          <>
            <StaffAvatar name={`${user.firstName} ${user.lastName}`} />
            <StatusBadge status={user.status} />
          </>
        )}
      </BackLink>

      {isSelf && (
        <p className="mb-4 text-sm text-amber-700">
          You cannot edit the logged-in user from Staff. Use My profile to update your details.
        </p>
      )}

      <Card>
        <form className="max-w-3xl space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First name</Label>
              <Input {...form.register('firstName', { required: true })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input {...form.register('lastName', { required: true })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...form.register('phone')} disabled={!canEdit} />
            </div>
            <div>
              <Label>Role</Label>
              {canEdit && can('USER_ASSIGN_ROLE') ? (
                <Select {...form.register('roleIds')}>
                  <option value="">Select role</option>
                  {roles.data?.items
                    .filter((role) => role.code !== 'DOCTOR')
                    .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value={user?.roles.map((role) => role.name).join(', ') || '—'} disabled />
              )}
            </div>
            <div>
              <Label>Created</Label>
              <Input value={user ? formatUtcMillis(user.createdAt) : ''} disabled />
            </div>
            <div>
              <Label>Two-factor authentication</Label>
              <Input value={user ? (user.mfaEnabled ? 'Enabled' : 'Not enrolled') : ''} disabled />
            </div>
          </div>
          {canResetMfa && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="danger" onClick={() => setMfaResetOpen(true)}>
                Reset 2FA
              </Button>
              <p className="text-sm text-slate-500">
                Clears this user&apos;s authenticator so they can enroll again on next sign-in.
              </p>
            </div>
          )}
          <AddressFields register={form.register} disabled={!canEdit} />
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {canEdit && (
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </form>
      </Card>

      <Modal
        open={mfaResetOpen}
        title="Reset two-factor authentication"
        onClose={() => setMfaResetOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMfaResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={resetMfa.isPending}
              onClick={() => resetMfa.mutate()}
            >
              {resetMfa.isPending ? 'Resetting…' : 'Reset 2FA'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          This will remove {user?.firstName} {user?.lastName}&apos;s authenticator setup and sign them out of all
          devices. They must scan a new QR code on their next sign-in.
        </p>
      </Modal>
    </div>
  );
}
