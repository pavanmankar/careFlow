'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiClientError } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { registerSchema, RegisterInput } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Eye } from 'lucide-react';
import { IconLink } from '@/components/ui/icon-button';
import { usePortalNavigate } from '@/components/portal-navigation';
import { subscriptionStatusLabel } from '@/components/subscription-required';
import { useEffect, useState } from 'react';

interface TenantRow {
  id: string;
  name: string;
  status: string;
  createdAt: number;
  subcriptionEnabled: boolean;
  subcriptionUntil: number | null;
  business: { name: string; businessType: string } | null;
  owner: { firstName: string; lastName: string; email: string } | null;
  employeeCount: number;
}

interface BusinessType {
  id: string;
  name: string;
  code: string;
}

interface Me {
  roles: string[];
}

export default function TenantsPage() {
  const navigate = usePortalNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const tenants = useQuery({
    queryKey: ['tenants', page],
    queryFn: () =>
      api.get<{ items: TenantRow[]; total: number }>(`/api/v1/tenants?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
    enabled: isSuperAdmin,
  });
  const types = useQuery({
    queryKey: ['business-types'],
    queryFn: () => api.get<{ items: BusinessType[] }>('/api/v1/business-types'),
    enabled: isSuperAdmin,
  });
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      businessTypeId: '',
      businessName: '',
    },
  });
  const items = (tenants.data?.items ?? []).filter((tenant) =>
    typeFilter ? tenant.business?.businessType === typeFilter : true,
  );

  useEffect(() => {
    if (me.isSuccess && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [me.isSuccess, isSuperAdmin, navigate]);

  function closeModal() {
    setOpen(false);
    setError(null);
    form.reset();
  }

  const create = useMutation({
    mutationFn: (values: RegisterInput) => api.post('/api/v1/tenants', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to create clinic'),
  });

  return (
    <div>
      <PageHeader
        description="Registered clinics on the platform."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-48"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter by clinic type"
            >
              <option value="">All types</option>
              {types.data?.items.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create clinic
            </Button>
          </div>
        }
      />
      <DataTable loading={tenants.isLoading}>
        <TableHead>
          <tr>
            <Th>Business</Th>
            <Th>Type</Th>
            <Th>Owner</Th>
            <Th>Employees</Th>
            <Th>Status</Th>
            <Th>Subscription</Th>
            <Th>Created</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {items.map((tenant) => {
            const subscription = subscriptionStatusLabel(tenant);
            return (
            <Tr key={tenant.id}>
              <Td className="font-medium text-slate-900">{tenant.business?.name ?? tenant.name}</Td>
              <Td>{tenant.business?.businessType ?? '—'}</Td>
              <Td>
                {tenant.owner ? (
                  <div>
                    <div className="text-slate-800">
                      {tenant.owner.firstName} {tenant.owner.lastName}
                    </div>
                    <div className="text-xs text-slate-400">{tenant.owner.email}</div>
                  </div>
                ) : (
                  '—'
                )}
              </Td>
              <Td>{tenant.employeeCount}</Td>
              <Td>
                <StatusBadge status={tenant.status} />
              </Td>
              <Td>
                <div className="text-slate-800">{subscription.label}</div>
                {subscription.tone === 'active' && tenant.subcriptionUntil != null && (
                  <div className="text-xs text-slate-400">Until {formatUtcMillis(tenant.subcriptionUntil)}</div>
                )}
              </Td>
              <Td className="text-slate-500">{formatUtcMillis(tenant.createdAt)}</Td>
              <Td className="text-right">
                <IconLink href={`/tenants/${tenant.id}`} icon={Eye} label="View clinic" />
              </Td>
            </Tr>
            );
          })}
          {!tenants.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={8}>
                No registered clinics yet. Create a clinic to get started.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={tenants.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={open}
        title="Create clinic"
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="create-tenant-form" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create clinic'}
            </Button>
          </div>
        }
      >
        <form
          id="create-tenant-form"
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <p className="text-sm text-slate-500">
            Creates the workspace, business profile, and an owner login. You stay signed in as platform admin.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Owner first name</Label>
              <Input {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label>Owner last name</Label>
              <Input {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label>Owner email</Label>
            <Input type="text" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label>Owner password</Label>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
            {form.formState.errors.password && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <Label>Type of clinic</Label>
            <Select {...form.register('businessTypeId')}>
              <option value="">Select type of clinic</option>
              {types.data?.items.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            {form.formState.errors.businessTypeId && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.businessTypeId.message}</p>
            )}
          </div>
          <div>
            <Label>Name of clinic</Label>
            <Input placeholder="Neha Dental Clinic" {...form.register('businessName')} />
            {form.formState.errors.businessName && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.businessName.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
