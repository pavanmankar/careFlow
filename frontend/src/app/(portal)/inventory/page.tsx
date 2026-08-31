'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Package, Plus, RefreshCw } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/stat-card';
import { AppointmentStatus } from '@/components/appointment-status';

const CATEGORIES = ['PPE', 'Fluids', 'Devices', 'Pharmacy', 'Consumables', 'Other'] as const;
const UNITS = ['boxes', 'packs', 'pcs', 'bottles', 'vials'] as const;

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  maxQuantity: number;
  status: string;
  percent: number;
}

interface InventoryList {
  items: InventoryItem[];
  total: number;
  counts: { items: number; available: number; lowStock: number; critical: number };
}

interface Me {
  permissions: string[];
}

type StockForm = {
  name: string;
  sku: string;
  category: (typeof CATEGORIES)[number];
  unit: (typeof UNITS)[number];
  quantity: number;
  maxQuantity: number;
};

const emptyForm: StockForm = {
  name: '',
  sku: '',
  category: 'PPE',
  unit: 'boxes',
  quantity: 0,
  maxQuantity: 100,
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const inventory = useQuery({
    queryKey: ['inventory', page],
    queryFn: () =>
      api.get<InventoryList>(`/api/v1/inventory?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
  });
  const addForm = useForm<StockForm>({ defaultValues: emptyForm });
  const editForm = useForm<StockForm>({ defaultValues: emptyForm });
  const permissions = me.data?.permissions ?? [];
  const canCreate = permissions.includes('INVENTORY_CREATE');
  const canUpdate = permissions.includes('INVENTORY_UPDATE');
  const items = inventory.data?.items ?? [];
  const counts = inventory.data?.counts ?? { items: 0, available: 0, lowStock: 0, critical: 0 };

  function closeAdd() {
    setAddOpen(false);
    setError(null);
    addForm.reset(emptyForm);
  }

  function closeEdit() {
    setEditItem(null);
    setError(null);
  }

  const create = useMutation({
    mutationFn: (values: StockForm) =>
      api.post('/api/v1/inventory', {
        name: values.name,
        sku: values.sku || null,
        category: values.category,
        unit: values.unit,
        quantity: Number(values.quantity) || 0,
        maxQuantity: Number(values.maxQuantity),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      closeAdd();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to add stock'),
  });

  const update = useMutation({
    mutationFn: (values: StockForm) =>
      api.patch(`/api/v1/inventory/${editItem?.id}`, {
        name: values.name,
        quantity: Number(values.quantity) || 0,
        maxQuantity: Number(values.maxQuantity),
        category: values.category,
        unit: values.unit,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      closeEdit();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to update stock'),
  });

  const reset = useMutation({
    mutationFn: () => api.post('/api/v1/inventory/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setResetOpen(false);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Unable to reset stock'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="Clinic stock. Availability is based on quantity versus max."
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            ) : null}
            {canCreate ? (
              <Button type="button" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add stock
              </Button>
            ) : null}
          </div>
        }
      />
      {error && !addOpen && !editItem && !resetOpen ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Items" value={inventory.isLoading ? '—' : counts.items} icon={Package} />
        <StatCard label="Available" value={inventory.isLoading ? '—' : counts.available} icon={Package} />
        <StatCard label="Low stock" value={inventory.isLoading ? '—' : counts.lowStock} icon={AlertTriangle} />
        <StatCard label="Critical" value={inventory.isLoading ? '—' : counts.critical} icon={AlertTriangle} />
      </div>
      <DataTable loading={inventory.isLoading}>
        <TableHead>
          <tr>
            <Th>Item</Th>
            <Th>SKU</Th>
            <Th>Availability</Th>
            <Th>Qty</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {items.map((item) => (
            <Tr key={item.id}>
              <Td>
                <span className="font-medium text-navy-900">{item.name}</span>
                <span className="block text-xs font-normal text-slate-400">{item.category}</span>
              </Td>
              <Td>{item.sku}</Td>
              <Td>
                <AppointmentStatus status={item.status} />
              </Td>
              <Td>
                <div className="w-28">
                  <div className="mb-1 text-xs text-slate-500">
                    {item.quantity} / {item.maxQuantity} {item.unit}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              </Td>
              <Td className="text-right">
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => {
                      setError(null);
                      setEditItem(item);
                      editForm.reset({
                        name: item.name,
                        sku: item.sku,
                        category: CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])
                          ? (item.category as (typeof CATEGORIES)[number])
                          : 'Other',
                        unit: UNITS.includes(item.unit as (typeof UNITS)[number])
                          ? (item.unit as (typeof UNITS)[number])
                          : 'pcs',
                        quantity: item.quantity,
                        maxQuantity: item.maxQuantity,
                      });
                    }}
                  >
                    Update
                  </Button>
                ) : null}
              </Td>
            </Tr>
          ))}
          {!inventory.isLoading && items.length === 0 && (
            <tr>
              <td className="px-6 py-16 text-center text-slate-500" colSpan={5}>
                No stock items yet. Add stock to start tracking quantities.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={inventory.data?.total ?? 0} onPageChange={setPage} />

      <Modal
        open={addOpen}
        title="Add stock"
        onClose={closeAdd}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeAdd}>
              Cancel
            </Button>
            <Button type="submit" form="add-stock-form" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add stock'}
            </Button>
          </div>
        }
      >
        <form id="add-stock-form" className="space-y-3" onSubmit={addForm.handleSubmit((values) => create.mutate(values))}>
          <StockFields form={addForm} skuOptional />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(editItem)}
        title="Update stock"
        onClose={closeEdit}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" form="update-stock-form" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <form id="update-stock-form" className="space-y-3" onSubmit={editForm.handleSubmit((values) => update.mutate(values))}>
          <StockFields form={editForm} skuDisabled />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </Modal>

      <Modal
        open={resetOpen}
        title="Reset stock"
        onClose={() => setResetOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={reset.isPending} onClick={() => reset.mutate()}>
              {reset.isPending ? 'Resetting…' : 'Set all to 0'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">This sets every item’s quantity to 0. Max quantities stay the same.</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Modal>
    </div>
  );
}

function StockFields({
  form,
  skuOptional,
  skuDisabled,
}: {
  form: ReturnType<typeof useForm<StockForm>>;
  skuOptional?: boolean;
  skuDisabled?: boolean;
}) {
  return (
    <>
      <div>
        <Label>Name</Label>
        <Input {...form.register('name', { required: true })} />
      </div>
      <div>
        <Label>SKU{skuOptional ? ' (optional)' : ''}</Label>
        <Input {...form.register('sku')} disabled={skuDisabled} placeholder={skuOptional ? 'Auto-generated if empty' : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select {...form.register('category', { required: true })}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Unit</Label>
          <Select {...form.register('unit', { required: true })}>
            {UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantity</Label>
          <Input type="number" min={0} {...form.register('quantity', { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <Label>Max quantity</Label>
          <Input type="number" min={1} {...form.register('maxQuantity', { required: true, valueAsNumber: true })} />
        </div>
      </div>
    </>
  );
}
