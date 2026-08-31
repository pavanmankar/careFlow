'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { UserRound, LogOut } from 'lucide-react';
import { api, ApiClientError, setAccessToken, setApiBusy } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { type Address } from '@/lib/address';
import { StaffAvatar } from '@/components/staff-avatar';

interface Me {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    timezone: string | null;
  };
  roles: string[];
  roleAssignments?: Array<{ id: string; name: string; code: string }>;
  permissions: string[];
}

interface AssignableRole {
  id: string;
  name: string;
  code: string;
}

interface Business {
  id: string;
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
}

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  clinicName: string;
  legalName: string;
  clinicEmail: string;
  clinicPhone: string;
  website: string;
  currency: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function systemTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

function roleLabel(roles: string[]) {
  if (roles.includes('SUPER_ADMIN')) {
    return 'Super Admin';
  }
  const labels: string[] = [];
  if (roles.includes('TENANT_OWNER')) {
    labels.push('Owner');
  }
  if (roles.includes('DOCTOR')) {
    labels.push('Doctor');
  }
  for (const role of roles) {
    if (role === 'TENANT_OWNER' || role === 'DOCTOR' || role === 'SUPER_ADMIN') {
      continue;
    }
    labels.push(role.replace(/_/g, ' '));
  }
  return labels.join(' · ') || 'User';
}

export function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraRoleIds, setExtraRoleIds] = useState<string[]>([]);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/api/v1/auth/me'),
  });
  const form = useForm<ProfileForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      clinicName: '',
      legalName: '',
      clinicEmail: '',
      clinicPhone: '',
      website: '',
      currency: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });
  const user = me.data?.user;
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const isOwner = me.data?.roles.includes('TENANT_OWNER') ?? false;
  const canUpdateClinic = me.data?.permissions.includes('BUSINESS_UPDATE') ?? false;
  const business = useQuery({
    queryKey: ['business'],
    queryFn: () => api.get<Business>('/api/v1/business'),
    enabled: profileOpen && !isSuperAdmin,
  });
  const assignableRoles = useQuery({
    queryKey: ['me', 'assignable-roles'],
    queryFn: () => api.get<{ items: AssignableRole[] }>('/api/v1/auth/me/assignable-roles'),
    enabled: profileOpen && isOwner,
  });

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!user || !profileOpen) {
      return;
    }
    const address = business.data?.address ?? {};
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      clinicName: business.data?.name ?? '',
      legalName: business.data?.legalName ?? '',
      clinicEmail: business.data?.email ?? '',
      clinicPhone: business.data?.phone ?? '',
      website: business.data?.website ?? '',
      currency: business.data?.currency ?? '',
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      postalCode: address.postalCode ?? '',
      country: address.country ?? '',
    });
    setExtraRoleIds(
      (me.data?.roleAssignments ?? []).filter((role) => role.code !== 'TENANT_OWNER').map((role) => role.id),
    );
  }, [user, business.data, profileOpen, form, me.data?.roleAssignments]);

  function openProfile() {
    if (!user) {
      return;
    }
    setError(null);
    setMenuOpen(false);
    setProfileOpen(true);
  }

  function closeProfile() {
    setProfileOpen(false);
    setError(null);
  }

  const save = useMutation({
    mutationFn: async (values: ProfileForm) => {
      await api.put('/api/v1/auth/me', {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone.trim(),
        timezone: systemTimezone(),
      });
      if (isOwner) {
        await api.put('/api/v1/auth/me/roles', { extraRoleIds });
      }
      if (canUpdateClinic && business.data) {
        await api.put('/api/v1/business', {
          name: values.clinicName,
          legalName: values.legalName || null,
          email: values.clinicEmail || '',
          phone: values.clinicPhone || null,
          website: values.website || '',
          timezone: systemTimezone(),
          currency: values.currency,
          address: {
            line1: values.line1 || undefined,
            line2: values.line2 || undefined,
            city: values.city || undefined,
            state: values.state || undefined,
            postalCode: values.postalCode || undefined,
            country: values.country || undefined,
          },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['business'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      setProfileOpen(false);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to save profile'),
  });

  if (!user) {
    return <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-100" />;
  }

  const name = `${user.firstName} ${user.lastName}`.trim();
  const clinic = business.data;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 text-left hover:bg-slate-50"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <StaffAvatar name={name} size="sm" />
        <span className="hidden sm:block">
          <span className="block max-w-[160px] truncate text-sm font-medium text-slate-900">{name}</span>
          <span className="block text-xs text-slate-500">{roleLabel(me.data?.roles ?? [])}</span>
        </span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="truncate text-sm font-medium text-slate-900">{name}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={openProfile}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4 text-slate-400" />
            My profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setMenuOpen(false);
              setApiBusy(true, 'Signing out');
              try {
                await api.post('/api/v1/auth/logout');
              } catch {
                // Still leave the local session if the API call fails.
              }
              setAccessToken(null);
              router.push('/login');
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign out
          </button>
        </div>
      )}

      <Modal
        open={profileOpen}
        title="My profile"
        onClose={closeProfile}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeProfile}>
              Cancel
            </Button>
            <Button type="submit" form="profile-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <form id="profile-form" className="space-y-5" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Personal</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>First name</Label>
                <Input {...form.register('firstName', { required: true })} />
              </div>
              <div>
                <Label required>Last name</Label>
                <Input {...form.register('lastName', { required: true })} />
              </div>
            </div>
            <div>
              <Label required>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div>
              <Label required>Phone</Label>
              <Input {...form.register('phone', { required: true })} />
            </div>
          </section>

          {isOwner && (
            <section className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</h3>
              <div>
                <Label>Role</Label>
                <Select
                  value={extraRoleIds[0] ?? ''}
                  onChange={(event) => setExtraRoleIds(event.target.value ? [event.target.value] : [])}
                >
                  <option value="">Owner only</option>
                  {(assignableRoles.data?.items ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      Owner · {role.name}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="text-xs text-slate-500">
                Owner stays assigned. Choose Doctor to appear on the Doctors page and take bookings.
              </p>
            </section>
          )}

          {clinic && (
            <section className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic</h3>
              <p className="text-xs text-slate-500">Type: {clinic.businessType.name}</p>
              <div>
                <Label>Name of clinic</Label>
                <Input {...form.register('clinicName', { required: canUpdateClinic })} disabled={!canUpdateClinic} />
              </div>
              <div>
                <Label>Legal name</Label>
                <Input {...form.register('legalName')} disabled={!canUpdateClinic} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Clinic email</Label>
                  <Input {...form.register('clinicEmail')} disabled={!canUpdateClinic} />
                </div>
                <div>
                  <Label>Clinic phone</Label>
                  <Input {...form.register('clinicPhone')} disabled={!canUpdateClinic} />
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input {...form.register('website')} disabled={!canUpdateClinic} />
              </div>
              <div>
                <Label>Address line 1</Label>
                <Input {...form.register('line1')} disabled={!canUpdateClinic} />
              </div>
              <div>
                <Label>Address line 2</Label>
                <Input {...form.register('line2')} disabled={!canUpdateClinic} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input {...form.register('city')} disabled={!canUpdateClinic} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input {...form.register('state')} disabled={!canUpdateClinic} />
                </div>
                <div>
                  <Label>Postal code</Label>
                  <Input {...form.register('postalCode')} disabled={!canUpdateClinic} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input {...form.register('country')} disabled={!canUpdateClinic} />
                </div>
              </div>
            </section>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
