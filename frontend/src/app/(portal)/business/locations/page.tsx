'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { api, ApiClientError, getActiveLocationId, setActiveLocationId } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/modal';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { useState } from 'react';

interface Location {
  id: string;
  name: string;
  code: string;
  timezone: string;
  status: string;
  createdAt: number;
}

interface Me {
  permissions: string[];
}

type CreateLocationForm = {
  name: string;
  code: string;
  timezone: string;
};

export default function LocationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const list = useQuery({
    queryKey: ['locations', page],
    queryFn: () =>
      api.get<{ items: Location[]; total: number }>(`/api/v1/locations?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
  });
  const form = useForm<CreateLocationForm>({
    defaultValues: { name: '', code: '', timezone: 'Asia/Kolkata' },
  });
  const canCreate = me.data?.permissions.includes('LOCATION_CREATE') ?? false;
  const items = list.data?.items ?? [];

  function closeModal() {
    setOpen(false);
    setError(null);
    form.reset({ name: '', code: '', timezone: 'Asia/Kolkata' });
  }

  const create = useMutation({
    mutationFn: (values: CreateLocationForm) =>
      api.post<{ id: string }>('/api/v1/locations', {
        name: values.name.trim(),
        code: values.code.trim(),
        timezone: values.timezone.trim() || 'Asia/Kolkata',
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      if (!getActiveLocationId() && data?.id) {
        setActiveLocationId(data.id);
      }
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to add location'),
  });

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Clinic branches used for appointments, patients, and staff."
        actions={
          canCreate ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add location
            </Button>
          ) : undefined
        }
      />

      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <DataTable loading={list.isLoading}>
        <TableHead>
          <tr>
            <Th>Name</Th>
            <Th>Code</Th>
            <Th>Timezone</Th>
            <Th>Status</Th>
            <Th>Created</Th>
          </tr>
        </TableHead>
        <tbody>
          {items.map((loc) => (
            <Tr key={loc.id}>
              <Td className="font-medium text-slate-900">{loc.name}</Td>
              <Td>{loc.code}</Td>
              <Td>{loc.timezone}</Td>
              <Td>
                <StatusBadge status={loc.status} />
              </Td>
              <Td className="text-slate-500">{formatUtcMillis(loc.createdAt)}</Td>
            </Tr>
          ))}
          {!list.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={5}>
                No locations yet. Add a branch to start booking appointments.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={list.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={open}
        title="Add location"
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="add-location-form" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Add location'}
            </Button>
          </div>
        }
      >
        <form
          id="add-location-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <div>
            <Label required>Name</Label>
            <Input {...form.register('name', { required: true })} placeholder="Andheri West" />
          </div>
          <div>
            <Label required>Code</Label>
            <Input {...form.register('code', { required: true })} placeholder="ANDHERI" />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input {...form.register('timezone')} disabled />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
