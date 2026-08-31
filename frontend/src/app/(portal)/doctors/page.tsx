'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiClientError } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressFields } from '@/components/address-fields';
import { IconButton } from '@/components/ui/icon-button';
import { StaffAvatar } from '@/components/staff-avatar';
import { ListSearch, useAppliedSearch } from '@/components/list-search';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { usePortalNavigate } from '@/components/portal-navigation';
import { useEffect, useState } from 'react';

interface DoctorRow {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  status: string;
  createdAt: number | null;
}

interface Me {
  permissions: string[];
}

type CreateDoctorForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function addressPayload(values: CreateDoctorForm) {
  return {
    line1: values.line1.trim(),
    line2: values.line2.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim(),
  };
}

export default function DoctorsPage() {
  const navigate = usePortalNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const appliedSearch = useAppliedSearch(search);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  useEffect(() => {
    setPage(1);
  }, [appliedSearch]);
  const params = new URLSearchParams({
    managed: 'true',
    page: String(page),
    pageSize: String(DEFAULT_PAGE_SIZE),
  });
  if (appliedSearch) {
    params.set('search', appliedSearch);
  }
  const doctors = useQuery({
    queryKey: ['doctors', 'managed', page, appliedSearch],
    queryFn: () =>
      api.get<{ items: DoctorRow[]; total: number }>(`/api/v1/doctors?${params.toString()}`),
  });
  const form = useForm<CreateDoctorForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
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
  const items = doctors.data?.items ?? [];

  function closeModal() {
    setOpen(false);
    setError(null);
    form.reset();
  }

  const create = useMutation({
    mutationFn: (values: CreateDoctorForm) =>
      api.post('/api/v1/doctors', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone.trim(),
        specialty: values.specialty.trim(),
        address: addressPayload(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to add doctor'),
  });

  const toggle = useMutation({
    mutationFn: (doctor: DoctorRow) =>
      api.post(`/api/v1/doctors/${doctor.id}/${doctor.status === 'ACTIVE' ? 'deactivate' : 'activate'}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to update status'),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search doctor"
        />
        {can('DOCTOR_CREATE') ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add doctor
          </Button>
        ) : null}
      </div>

      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <DataTable loading={doctors.isLoading}>
        <TableHead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Specialty</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {items.map((doctor) => (
            <Tr key={doctor.id}>
              <Td className="font-medium text-slate-900">
                <Link className="flex items-center gap-3 hover:text-brand-700" href={`/doctors/${doctor.id}`}>
                  <StaffAvatar name={doctor.name} />
                  {doctor.name}
                </Link>
              </Td>
              <Td>{doctor.email}</Td>
              <Td>{doctor.phone || '—'}</Td>
              <Td>{doctor.specialty || '—'}</Td>
              <Td>
                <StatusBadge status={doctor.status} />
              </Td>
              <Td className="text-slate-500">{formatUtcMillis(doctor.createdAt)}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  {can('DOCTOR_UPDATE') && (
                    <IconButton icon={Pencil} label="Edit" onClick={() => navigate(`/doctors/${doctor.id}`)} />
                  )}
                  {can('DOCTOR_ACTIVATE') && (
                    <IconButton
                      icon={doctor.status === 'ACTIVE' ? UserX : UserCheck}
                      label={doctor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      tone={doctor.status === 'ACTIVE' ? 'danger' : 'default'}
                      onClick={() => toggle.mutate(doctor)}
                      disabled={toggle.isPending}
                    />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {!doctors.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={7}>
                No doctors {appliedSearch ? 'match that name.' : 'yet. Add a doctor to start taking appointments.'}
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={doctors.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={open}
        title="Add doctor"
        onClose={closeModal}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="add-doctor-form" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add doctor'}
            </Button>
          </div>
        }
      >
        <form id="add-doctor-form" className="space-y-3" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
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
            <Input type="text" autoComplete="email" {...form.register('email', { required: true })} />
          </div>
          <div>
            <Label required>Phone</Label>
            <Input {...form.register('phone', { required: true })} />
          </div>
          <div>
            <Label required>Specialty</Label>
            <Input placeholder="Cardiology" {...form.register('specialty', { required: true })} />
          </div>
          <p className="text-xs text-slate-500">This account is created with the Doctor role. Sign-in password is Test@1234.</p>
          <AddressFields register={form.register} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
