'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { usePortalId } from '@/components/portal-navigation';
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressFields } from '@/components/address-fields';
import { type Address } from '@/lib/address';
import { BackLink } from '@/components/ui/icon-button';
import { StaffAvatar } from '@/components/staff-avatar';

interface DoctorDetail {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  timezone: string | null;
  status: string;
  createdAt: number | null;
  address: Address | null;
}

interface Me {
  user: { id: string };
  permissions: string[];
}

type DoctorForm = {
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function DoctorDetailPage() {
  const params = { id: usePortalId() };
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const doctor = useQuery({
    queryKey: ['doctors', params.id],
    queryFn: () => api.get<DoctorDetail>(`/api/v1/doctors/${params.id}`),
    enabled: Boolean(params.id),
  });
  const form = useForm<DoctorForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      specialty: '',
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
  const isSelf = Boolean(me.data?.user.id && me.data.user.id === params.id);
  const canEdit = can('DOCTOR_UPDATE') && !isSelf;
  const user = doctor.data;

  useEffect(() => {
    if (!user) {
      return;
    }
    const address = user.address ?? {};
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      specialty: user.specialty ?? '',
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      postalCode: address.postalCode ?? '',
      country: address.country ?? '',
    });
  }, [user, form]);

  const save = useMutation({
    mutationFn: (values: DoctorForm) =>
      api.put(`/api/v1/doctors/${params.id}`, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || null,
        specialty: values.specialty,
        address: {
          line1: values.line1 || undefined,
          line2: values.line2 || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          postalCode: values.postalCode || undefined,
          country: values.country || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      qc.invalidateQueries({ queryKey: ['doctors', params.id] });
      setMessage('Doctor details saved');
      setError(null);
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof ApiClientError ? err.message : 'Unable to save doctor');
    },
  });

  return (
    <div>
      <BackLink href="/doctors" label={user ? user.name : 'Doctor'} heading>
        {user && (
          <>
            <StaffAvatar name={user.name} />
            <StatusBadge status={user.status} />
          </>
        )}
      </BackLink>

      {isSelf && (
        <p className="mb-4 text-sm text-amber-700">
          You cannot edit the logged-in user from Doctors. Use My profile to update your details.
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
              <Input value="Doctor" disabled />
            </div>
            <div>
              <Label>Specialty</Label>
              <Input {...form.register('specialty')} disabled={!canEdit} placeholder="Cardiology" />
            </div>
            <div>
              <Label>Created</Label>
              <Input value={user?.createdAt ? formatUtcMillis(user.createdAt) : ''} disabled />
            </div>
          </div>
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
    </div>
  );
}
