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
import { Modal } from '@/components/ui/modal';
import { Plus, KeyRound, Trash2 } from 'lucide-react';
import { IconButton, IconLink } from '@/components/ui/icon-button';
import { useState } from 'react';

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  createdAt: number;
}

interface Me {
  permissions: string[];
}

type CreateRoleForm = {
  name: string;
  description: string;
};

function roleCodeFromName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<RoleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const roles = useQuery({
    queryKey: ['roles', page],
    queryFn: () =>
      api.get<{ items: RoleRow[]; total: number }>(`/api/v1/roles?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
  });
  const form = useForm<CreateRoleForm>({ defaultValues: { name: '', description: '' } });
  const canCreate = me.data?.permissions.includes('ROLE_CREATE');
  const canDelete = me.data?.permissions.includes('ROLE_DELETE');
  const items = roles.data?.items ?? [];

  function closeModal() {
    setOpen(false);
    setError(null);
    form.reset();
  }

  const create = useMutation({
    mutationFn: (values: CreateRoleForm) =>
      api.post('/api/v1/roles', {
        name: values.name.trim(),
        code: roleCodeFromName(values.name),
        description: values.description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to create role'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteRole(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to delete role'),
  });

  return (
    <div>
      <PageHeader
        description="Roles you create are visible only in this clinic."
        actions={
          canCreate ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create role
            </Button>
          ) : undefined
        }
      />

      <DataTable loading={roles.isLoading}>
        <TableHead>
          <tr>
            <Th>Role name</Th>
            <Th>Users</Th>
            <Th>Created</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {items.map((role) => (
            <Tr key={role.id}>
              <Td className="font-medium text-slate-900">{role.name}</Td>
              <Td>{role.userCount}</Td>
              <Td className="text-slate-500">{formatUtcMillis(role.createdAt)}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  <IconLink
                    href={`/user-management/roles/${role.id}/permissions`}
                    icon={KeyRound}
                    label="Permissions"
                  />
                  {canDelete && (
                    <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleteRole(role)} />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {!roles.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={4}>
                No roles yet. Create a role to assign to staff.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={roles.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={open}
        title="Create role"
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="create-role-form" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create role'}
            </Button>
          </div>
        }
      >
        <form
          id="create-role-form"
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <div>
            <Label>Name</Label>
            <Input placeholder="Receptionist" {...form.register('name', { required: true })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="Front desk access" {...form.register('description')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteRole)}
        title="Delete role"
        onClose={() => setDeleteRole(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteRole(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending || !deleteRole}
              onClick={() => deleteRole && remove.mutate(deleteRole.id)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {deleteRole
            ? `Delete “${deleteRole.name}”? Staff with this role will also be removed.`
            : ''}
        </p>
      </Modal>
    </div>
  );
}
