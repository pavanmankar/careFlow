'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

interface DoctorRoleDetail {
  id: string;
  name: string;
  code: string;
  permissions: string[];
}

const REQUIRED_PERMISSION = 'DOCTOR_READ';

export default function DoctorPermissionsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => api.get<{ modules: ModuleGroup[] }>('/api/v1/permissions?grouped=true'),
  });
  const role = useQuery({
    queryKey: ['roles', 'system', 'doctor'],
    queryFn: () => api.get<DoctorRoleDetail>('/api/v1/roles/system/doctor'),
  });

  useEffect(() => {
    if (role.data) {
      setSelected(role.data.permissions);
    }
  }, [role.data]);

  const save = useMutation({
    mutationFn: () => api.put('/api/v1/roles/system/doctor/permissions', { permissionCodes: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', 'system', 'doctor'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      setMessage('Doctor permissions saved for this branch. All doctors will use this permission set.');
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Save failed'),
  });

  function toggle(code: string) {
    if (code === REQUIRED_PERMISSION) {
      return;
    }
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  return (
    <div>
      <BackLink href="/doctors" label="Doctor permissions" heading />
      <p className="-mt-4 mb-6 text-sm text-slate-500">
        One permission set applies to every doctor in this clinic branch. Changes take effect on the next request.
      </p>
      <Card>
        <div className="space-y-8">
          {catalog.data?.modules.map((mod) => (
            <section key={mod.code}>
              <h2 className="mb-3 font-medium text-brand-900">{mod.name}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {mod.permissions.map((perm) => {
                  const locked = perm.code === REQUIRED_PERMISSION;
                  return (
                    <label
                      key={perm.code}
                      className={`flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 ${locked ? 'bg-slate-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(perm.code)}
                        disabled={locked}
                        onChange={() => toggle(perm.code)}
                      />
                      <span className="text-sm">
                        {perm.name}
                        {locked ? ' (required)' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Button className="mt-6" onClick={() => save.mutate()} disabled={save.isPending || role.isLoading}>
          Save doctor permissions
        </Button>
      </Card>
    </div>
  );
}
