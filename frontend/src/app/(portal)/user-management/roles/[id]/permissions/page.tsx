'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePortalId } from '@/components/portal-navigation';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/icon-button';

interface Permission {
  code: string;
  name: string;
  action: string;
}

interface ModuleGroup {
  code: string;
  name: string;
  permissions: Permission[];
}

interface RoleDetail {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export default function RolePermissionsPage() {
  const params = { id: usePortalId() };
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => api.get<{ modules: ModuleGroup[] }>('/api/v1/permissions?grouped=true'),
  });
  const role = useQuery({
    queryKey: ['role', params.id],
    queryFn: () => api.get<RoleDetail>(`/api/v1/roles/${params.id}`),
  });

  useEffect(() => {
    if (role.data) {
      setSelected(role.data.permissions);
    }
  }, [role.data]);

  const save = useMutation({
    mutationFn: () => api.put(`/api/v1/roles/${params.id}/permissions`, { permissionCodes: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role', params.id] });
      qc.invalidateQueries({ queryKey: ['me'] });
      setMessage('Permissions saved');
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Save failed'),
  });

  function toggle(code: string) {
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  return (
    <div>
      <BackLink
        href="/user-management/roles"
        label={role.data ? `${role.data.name} permissions` : 'Permissions'}
        heading
      />
      <p className="-mt-4 mb-6 text-sm text-slate-500">
        Grant API actions to this role. Changes apply on the next request.
      </p>
      <Card>
        <div className="space-y-8">
          {catalog.data?.modules.map((mod) => (
            <section key={mod.code}>
              <h2 className="mb-3 font-medium text-brand-900">{mod.name}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {mod.permissions.map((perm) => (
                  <label key={perm.code} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(perm.code)}
                      onChange={() => toggle(perm.code)}
                    />
                    <span className="text-sm">{perm.name}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Button className="mt-6" onClick={() => save.mutate()} disabled={save.isPending}>
          Save permissions
        </Button>
      </Card>
    </div>
  );
}
