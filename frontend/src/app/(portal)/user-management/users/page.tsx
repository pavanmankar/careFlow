'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiClientError } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressFields } from '@/components/address-fields';
import { IconButton } from '@/components/ui/icon-button';
import { StaffAvatar } from '@/components/staff-avatar';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { usePortalNavigate } from '@/components/portal-navigation';
import { useState } from 'react';

interface Role {
  id: string;
  name: string;
  code: string;
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: number;
  roles: Role[];
}

interface Me {
  user: { id: string };
  permissions: string[];
}

type CreateUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleIds: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function addressPayload(values: CreateUserForm) {
  return {
    line1: values.line1 || undefined,
    line2: values.line2 || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    postalCode: values.postalCode || undefined,
    country: values.country || undefined,
  };
}

export default function UsersPage() {
  const navigate = usePortalNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const users = useQuery({
    queryKey: ['users', page],
    queryFn: () =>
      api.get<{ items: UserRow[]; total: number }>(`/api/v1/users?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
  });
  const roles = useQuery({
    queryKey: ['roles', 'assignable'],
    queryFn: () => api.get<{ items: Role[] }>('/api/v1/roles?assignable=true'),
    enabled: open,
  });
  const form = useForm<CreateUserForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
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
  const myId = me.data?.user.id;
  const items = (users.data?.items ?? []).filter((user) => user.id !== myId);

  function closeModal() {
    setOpen(false);
    setError(null);
    form.reset();
  }

  function onEdit(user: UserRow) {
    navigate(`/user-management/users/${user.id}`);
  }

  const create = useMutation({
    mutationFn: (values: CreateUserForm) =>
      api.post('/api/v1/users', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || null,
        roleIds: [values.roleIds],
        address: addressPayload(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to add user'),
  });

  const toggle = useMutation({
    mutationFn: (user: UserRow) =>
      api.post(`/api/v1/users/${user.id}/${user.status === 'ACTIVE' ? 'deactivate' : 'activate'}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to update status'),
  });

  return (
    <div>
      <PageHeader
        description="People who can access this clinic."
        actions={
          can('STAFF_CREATE') ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          ) : undefined
        }
      />

      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <DataTable loading={users.isLoading}>
        <TableHead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {items.map((user) => (
            <Tr key={user.id}>
              <Td className="font-medium text-slate-900">
                <Link className="flex items-center gap-3 hover:text-brand-700" href={`/user-management/users/${user.id}`}>
                  <StaffAvatar name={`${user.firstName} ${user.lastName}`} />
                  {user.firstName} {user.lastName}
                </Link>
              </Td>
              <Td>{user.email}</Td>
              <Td>{user.phone || '—'}</Td>
              <Td>{user.roles.map((r) => r.name).join(', ') || '—'}</Td>
              <Td>
                <StatusBadge status={user.status} />
              </Td>
              <Td className="text-slate-500">{formatUtcMillis(user.createdAt)}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  {can('STAFF_UPDATE') && (
                    <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(user)} />
                  )}
                  {can('STAFF_ACTIVATE') && (
                    <IconButton
                      icon={user.status === 'ACTIVE' ? UserX : UserCheck}
                      label={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      tone={user.status === 'ACTIVE' ? 'danger' : 'default'}
                      onClick={() => toggle.mutate(user)}
                      disabled={toggle.isPending}
                    />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {!users.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={7}>
                No staff yet. Add a team member to get started.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={users.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={open}
        title="Add user"
        onClose={closeModal}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add user'}
            </Button>
          </div>
        }
      >
        <form
          id="add-user-form"
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <Input {...form.register('firstName', { required: true })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input {...form.register('lastName', { required: true })} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="text" autoComplete="email" {...form.register('email', { required: true })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register('phone')} />
          </div>
          <div>
            <Label>Role</Label>
            <Select {...form.register('roleIds', { required: true })}>
              <option value="">Select role</option>
              {roles.data?.items
                .filter((role) => role.code !== 'DOCTOR')
                .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            {!roles.isLoading && (roles.data?.items.length ?? 0) === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No roles yet.{' '}
                <Link className="text-brand-600" href="/user-management/roles">
                  Create a role
                </Link>{' '}
                first.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">Sign-in password is Test@1234.</p>
          <AddressFields register={form.register} />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>

    </div>
  );
}
