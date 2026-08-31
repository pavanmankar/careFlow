'use client';

import { usePortalId } from '@/components/portal-navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BackLink } from '@/components/ui/icon-button';
import { PortalLink } from '@/components/portal-navigation';
import { Card } from '@/components/ui/card';
import { StaffAvatar } from '@/components/staff-avatar';
import { AppointmentStatus } from '@/components/appointment-status';
import {
  ageLabel,
  formatClinicDate,
  formatSlotLabel,
  hourInTimeZone,
  type ClinicPatient,
} from '@/lib/clinic';

interface PatientDetail extends ClinicPatient {
  appointments: Array<{
    id: string;
    type: string;
    status: string;
    startsAt: number;
    endsAt: number;
    doctor: { id: string; name: string; specialty: string };
  }>;
}

interface Me {
  business: { timezone: string } | null;
}

export default function PatientDetailPage() {
  const params = { id: usePortalId() };
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  const patient = useQuery({
    queryKey: ['patients', params.id],
    queryFn: () => api.get<PatientDetail>(`/api/v1/patients/${params.id}`),
    enabled: Boolean(params.id),
  });
  const row = patient.data;

  if (patient.isError || (patient.isSuccess && !row)) {
    return <p className="text-sm text-slate-500">Patient not found.</p>;
  }

  return (
    <div>
      <BackLink href="/patients" label={row?.name ?? 'Patient'} heading />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="flex flex-col items-center text-center xl:col-span-1">
          <StaffAvatar name={row?.name ?? 'Patient'} size="xl" />
          <h2 className="mt-4 text-lg font-semibold text-navy-900">{row?.name ?? '—'}</h2>
          <p className="text-sm text-slate-500">
            {row ? `${ageLabel(row.age)} · ${row.gender || '—'} · ${row.bloodGroup || '—'}` : '—'}
          </p>
          <p className="mt-2 text-sm text-slate-500">{row?.phone ?? '—'}</p>
        </Card>
        <div className="xl:col-span-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-navy-900">Appointment history</h3>
            {!row ? (
              <p className="text-sm text-slate-500">Loading appointments…</p>
            ) : row.appointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments yet.</p>
            ) : (
              <ul className="space-y-3">
                {row.appointments.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <PortalLink href={`/appointments/${item.id}`} className="hover:text-brand-700">
                      {formatClinicDate(item.startsAt, timezone)} · {formatSlotLabel(hourInTimeZone(item.startsAt, timezone))} · {item.type}
                      <span className="block text-xs text-slate-400">{item.doctor.name}</span>
                    </PortalLink>
                    <AppointmentStatus status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
