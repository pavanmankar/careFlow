'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiClientError } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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

export default function LocationsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['locations', page],
    queryFn: () =>
      api.get<{ items: Location[]; total: number }>(`/api/v1/locations?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`),
  });
  const form = useForm({ defaultValues: { name: '', code: '', timezone: 'Asia/Kolkata' } });
  const create = useMutation({
    mutationFn: (values: { name: string; code: string; timezone: string }) =>
      api.post('/api/v1/locations', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      form.reset();
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Create failed'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-brand-900">Locations</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th>Code</th>
                <th>Timezone</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((loc) => (
                <tr key={loc.id} className="border-b border-slate-100">
                  <td className="py-3">{loc.name}</td>
                  <td>{loc.code}</td>
                  <td>{loc.timezone}</td>
                  <td>{loc.status}</td>
                  <td>{formatUtcMillis(loc.createdAt)}</td>
                </tr>
              ))}
              {!list.data?.items.length && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={5}>
                    No locations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4">
            <Pagination page={page} total={list.data?.total ?? 0} onPageChange={setPage} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-medium">Add location</h2>
          <form className="space-y-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
            <div>
              <Label>Name</Label>
              <Input {...form.register('name', { required: true })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input {...form.register('code', { required: true })} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input {...form.register('timezone')} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={create.isPending}>
              Add location
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
