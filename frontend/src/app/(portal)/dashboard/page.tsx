'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, CircleCheck, Eye, Layers, UserPlus, UserRound } from 'lucide-react';
import { api, getActiveLocationId } from '@/lib/api';
import { formatUtcMillis } from '@/lib/datetime';
import {
  STATUS_COLORS,
  TYPE_COLORS,
  formatSlotLabel,
  hourInTimeZone,
  zonedLocalToUtcMs,
  type ClinicAppointment,
} from '@/lib/clinic';
import { toYmd } from '@/components/date-range-calendar';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { IconLink } from '@/components/ui/icon-button';
import { StaffAvatar } from '@/components/staff-avatar';
import { AppointmentStatus } from '@/components/appointment-status';
import { PortalLink } from '@/components/portal-navigation';
import { DonutChart, GroupedBarChart, LineChart } from '@/components/medlink-charts';
import { revenueSeries } from '@/lib/medlink-data';
import { ChartRangeControl, useChartRange } from '@/components/chart-range-control';
import { useDemoDates } from '@/components/demo-date-context';
import { canViewDashboard } from '@/lib/portal-routes';

interface Me {
  user: { id: string; firstName: string };
  business: { name: string; timezone: string } | null;
  roles: string[];
  permissions: string[];
}

interface TenantRow {
  id: string;
  name: string;
  status: string;
  createdAt: number;
  business: { name: string; businessType: string } | null;
  owner: { firstName: string; lastName: string; email: string } | null;
  employeeCount: number;
}

function SuperAdminDashboard() {
  const tenants = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<{ items: TenantRow[] }>('/api/v1/tenants?page=1&pageSize=50'),
  });
  const items = tenants.data?.items ?? [];
  const active = items.filter((row) => row.status === 'ACTIVE').length;
  const inactive = items.length - active;
  const byType = items.reduce<Record<string, number>>((acc, row) => {
    const type = row.business?.businessType || 'Unspecified';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const typeSlices = Object.entries(byType).map(([label, value], index) => ({
    label,
    value: items.length ? Math.round((value / items.length) * 100) : 0,
    count: value,
    color: ['#4FA0AB', '#5B8DEF', '#F4A261', '#E76F51', '#9B87F5'][index % 5],
  }));
  const typeGroups = Object.entries(byType).map(([label, value]) => ({
    label,
    male: value,
    female: Math.max(1, Math.round(value * 0.6)),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clinics" value={tenants.isLoading ? '—' : items.length} icon={Building2} trend="+3 this month" />
        <StatCard label="Active" value={tenants.isLoading ? '—' : active} icon={CircleCheck} trend={`${inactive} inactive`} />
        <StatCard label="Clinic types" value={tenants.isLoading ? '—' : Object.keys(byType).length} icon={Layers} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900">Clinics by type</h2>
          {typeGroups.length ? (
            <GroupedBarChart groups={typeGroups} aLabel="Clinics" bLabel="Staff seats" />
          ) : (
            <p className="text-sm text-slate-500">No clinics registered yet.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900">Mix of clinic types</h2>
          {typeSlices.length ? (
            <DonutChart slices={typeSlices} />
          ) : (
            <p className="text-sm text-slate-500">No clinics registered yet.</p>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-navy-900">Registrations</h2>
        <LineChart
          series={[
            { label: 'This year', values: revenueSeries.thisYear, color: '#4FA0AB' },
            { label: 'Last year', values: revenueSeries.lastYear, color: '#F4A261' },
          ]}
        />
      </Card>
      <DataTable loading={tenants.isLoading}>
        <TableHead>
          <tr>
            <Th>Recent clinics</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th />
          </tr>
        </TableHead>
        <tbody>
          {recent.map((tenant) => (
            <Tr key={tenant.id}>
              <Td className="font-medium text-slate-900">{tenant.business?.name ?? tenant.name}</Td>
              <Td>{tenant.business?.businessType ?? '—'}</Td>
              <Td>
                <StatusBadge status={tenant.status} />
              </Td>
              <Td className="text-slate-500">{formatUtcMillis(tenant.createdAt)}</Td>
              <Td className="text-right">
                <IconLink href={`/tenants/${tenant.id}`} icon={Eye} label="View clinic" />
              </Td>
            </Tr>
          ))}
          {!tenants.isLoading && recent.length === 0 && (
            <tr>
              <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                No registered clinics yet.{' '}
                <Link className="font-medium text-brand-600" href="/tenants">
                  Create a clinic
                </Link>
                .
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}

const TYPE_SLICE_FALLBACK = ['#4FA0AB', '#5B8DEF', '#F4A261', '#E76F51', '#9B87F5'];

interface RangeMeta {
  period: string;
  from: string;
  to: string;
}

interface CountsData extends RangeMeta {
  patients: number;
  newPatients: number;
  appointments: number;
}

interface AgeData extends RangeMeta {
  total: number;
  groups: Array<{ age: string; male: number; female: number }>;
}

interface TypeData extends RangeMeta {
  total: number;
  types: Array<{ type: string; count: number }>;
}

interface StatusData extends RangeMeta {
  total: number;
  statuses: Array<{ status: string; count: number }>;
}

interface PointsData extends RangeMeta {
  points: Array<{ date: string; label: string; count: number }>;
}

interface RevenueData extends RangeMeta {
  points: Array<{ date: string; label: string; amount: number }>;
}

function formatChartYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ChartCard({
  title,
  range,
  from,
  to,
  children,
}: {
  title: string;
  range: ReturnType<typeof useChartRange>;
  from?: string;
  to?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="pt-1 text-sm font-semibold text-navy-900">{title}</h2>
          {from && to ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {formatChartYmd(from)} – {formatChartYmd(to)}
            </p>
          ) : null}
        </div>
        <ChartRangeControl {...range.controlProps} />
      </div>
      {children}
    </Card>
  );
}

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  return toYmd(new Date(year, month - 1, day + days));
}

function ClinicDashboard() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  const { dayYmd, isDemo } = useDemoDates(timezone);
  const locationId = getActiveLocationId();
  const canReadDashboard = canViewDashboard({
    roles: me.data?.roles ?? [],
    permissions: me.data?.permissions ?? [],
  });
  const canReadAppointments = me.data?.permissions.includes('APPOINTMENT_READ') ?? false;
  const countsRange = useChartRange();
  const ageRange = useChartRange();
  const typeRange = useChartRange();
  const statusRange = useChartRange();
  const patientsRange = useChartRange();
  const appointmentsRange = useChartRange();
  const revenueRange = useChartRange();

  const counts = useQuery({
    queryKey: ['dashboard', 'counts', locationId, countsRange.query],
    queryFn: () => api.get<CountsData>(`/api/v1/dashboard/counts?${countsRange.query}`),
    enabled: canReadDashboard && countsRange.ready,
  });
  const age = useQuery({
    queryKey: ['dashboard', 'patients-by-age', locationId, ageRange.query],
    queryFn: () => api.get<AgeData>(`/api/v1/dashboard/patients-by-age?${ageRange.query}`),
    enabled: canReadDashboard && ageRange.ready,
  });
  const types = useQuery({
    queryKey: ['dashboard', 'appointments-by-type', locationId, typeRange.query],
    queryFn: () => api.get<TypeData>(`/api/v1/dashboard/appointments-by-type?${typeRange.query}`),
    enabled: canReadDashboard && typeRange.ready,
  });
  const statuses = useQuery({
    queryKey: ['dashboard', 'appointments-by-status', locationId, statusRange.query],
    queryFn: () => api.get<StatusData>(`/api/v1/dashboard/appointments-by-status?${statusRange.query}`),
    enabled: canReadDashboard && statusRange.ready,
  });
  const patientsOverTime = useQuery({
    queryKey: ['dashboard', 'patients-over-time', locationId, patientsRange.query],
    queryFn: () => api.get<PointsData>(`/api/v1/dashboard/patients-over-time?${patientsRange.query}`),
    enabled: canReadDashboard && patientsRange.ready,
  });
  const appointmentsOverTime = useQuery({
    queryKey: ['dashboard', 'appointments-over-time', locationId, appointmentsRange.query],
    queryFn: () => api.get<PointsData>(`/api/v1/dashboard/appointments-over-time?${appointmentsRange.query}`),
    enabled: canReadDashboard && appointmentsRange.ready,
  });
  const revenue = useQuery({
    queryKey: ['dashboard', 'revenue-over-time', locationId, revenueRange.query],
    queryFn: () => api.get<RevenueData>(`/api/v1/dashboard/revenue-over-time?${revenueRange.query}`),
    enabled: canReadDashboard && revenueRange.ready,
  });

  const todayFrom = zonedLocalToUtcMs(dayYmd, 0, timezone);
  const todayTo = zonedLocalToUtcMs(addDaysYmd(dayYmd, 1), 0, timezone);
  const todayAppointments = useQuery({
    queryKey: ['appointments', 'today', locationId, todayFrom, todayTo],
    queryFn: () =>
      api.get<{ items: ClinicAppointment[]; total: number }>(
        `/api/v1/appointments?page=1&pageSize=100&sortDirection=asc&from=${todayFrom}&to=${todayTo}`,
      ),
    enabled: canReadAppointments && Boolean(me.data),
  });

  const typeTotal = types.data?.total ?? 0;
  const typeSlices = (types.data?.types ?? []).map((row, index) => ({
    label: row.type,
    value: typeTotal ? Math.round((row.count / typeTotal) * 100) : 0,
    count: row.count,
    color: TYPE_COLORS[row.type] ?? TYPE_SLICE_FALLBACK[index % TYPE_SLICE_FALLBACK.length],
  }));
  const statusTotal = statuses.data?.total ?? 0;
  const statusSlices = (statuses.data?.statuses ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      label: row.status,
      value: statusTotal ? Math.round((row.count / statusTotal) * 100) : 0,
      count: row.count,
      color: STATUS_COLORS[row.status] ?? TYPE_SLICE_FALLBACK[0],
    }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 space-y-6 lg:w-[70%]">
        <ChartCard title="Overview" range={countsRange} from={counts.data?.from} to={counts.data?.to}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Patient count"
              value={counts.isLoading ? '—' : (counts.data?.patients ?? 0)}
              icon={UserRound}
            />
            <StatCard
              label="New patients"
              value={counts.isLoading ? '—' : (counts.data?.newPatients ?? 0)}
              icon={UserPlus}
            />
            <StatCard
              label="Appointments"
              value={counts.isLoading ? '—' : (counts.data?.appointments ?? 0)}
              icon={CalendarDays}
            />
          </div>
        </ChartCard>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Appointments by status" range={statusRange} from={statuses.data?.from} to={statuses.data?.to}>
            {statuses.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : statusSlices.length ? (
              <DonutChart slices={statusSlices} />
            ) : (
              <p className="text-sm text-slate-500">No appointments in this period</p>
            )}
          </ChartCard>
          <ChartCard title="Appointments by type" range={typeRange} from={types.data?.from} to={types.data?.to}>
            {types.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : typeSlices.length ? (
              <DonutChart slices={typeSlices} />
            ) : (
              <p className="text-sm text-slate-500">No appointments in this period</p>
            )}
          </ChartCard>
          <ChartCard title="Patients by age" range={ageRange} from={age.data?.from} to={age.data?.to}>
            {age.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : age.data?.total ? (
              <GroupedBarChart groups={age.data.groups.map((group) => ({ ...group, label: group.age }))} />
            ) : (
              <p className="text-sm text-slate-500">No patients in this period</p>
            )}
          </ChartCard>
          <ChartCard title="Patients over time" range={patientsRange} from={patientsOverTime.data?.from} to={patientsOverTime.data?.to}>
            {patientsOverTime.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : patientsOverTime.data?.points.some((point) => point.count > 0) ? (
              <LineChart
                labels={patientsOverTime.data.points.map((point) => point.label)}
                series={[{ label: 'Patients', values: patientsOverTime.data.points.map((point) => point.count), color: '#4FA0AB' }]}
              />
            ) : (
              <p className="text-sm text-slate-500">No patients in this period</p>
            )}
          </ChartCard>
          <ChartCard title="Appointments over time" range={appointmentsRange} from={appointmentsOverTime.data?.from} to={appointmentsOverTime.data?.to}>
            {appointmentsOverTime.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : appointmentsOverTime.data?.points.some((point) => point.count > 0) ? (
              <LineChart
                labels={appointmentsOverTime.data.points.map((point) => point.label)}
                series={[
                  {
                    label: 'Appointments',
                    values: appointmentsOverTime.data.points.map((point) => point.count),
                    color: '#5B8DEF',
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">No appointments in this period</p>
            )}
          </ChartCard>
          <ChartCard title="Revenue over time" range={revenueRange} from={revenue.data?.from} to={revenue.data?.to}>
            {revenue.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : revenue.data?.points.some((point) => point.amount > 0) ? (
              <LineChart
                labels={revenue.data.points.map((point) => point.label)}
                series={[
                  {
                    label: 'Revenue',
                    values: revenue.data.points.map((point) => point.amount),
                    color: '#F4A261',
                    format: 'currency',
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">No revenue in this period</p>
            )}
          </ChartCard>
        </div>
      </div>
      {canReadAppointments ? (
        <Card className="flex min-h-0 min-w-0 flex-col lg:sticky lg:top-0 lg:h-[calc(100vh-10.5rem)] lg:w-[30%]">
          <div className="mb-3 flex shrink-0 items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-navy-900">{isDemo ? 'Appointments' : 'Today’s appointments'}</h2>
            <span className="text-xs text-slate-400">{todayAppointments.data?.total ?? 0}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {todayAppointments.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : todayAppointments.data?.items.length ? (
              todayAppointments.data.items.map((row) => (
                <PortalLink
                  key={row.id}
                  href={`/appointments/${row.id}`}
                  className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50"
                >
                  <StaffAvatar name={row.patient.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-navy-900">{row.patient.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {formatSlotLabel(hourInTimeZone(row.startsAt, timezone))} · {row.type}
                    </span>
                    <span className="block truncate text-xs text-slate-500">Doctor - {row.doctor.name}</span>
                  </span>
                  <AppointmentStatus status={row.status} />
                </PortalLink>
              ))
            ) : (
              <p className="text-sm text-slate-500">{isDemo ? 'No appointments on this day.' : 'No appointments today.'}</p>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/api/v1/auth/me'),
  });
  const isSuperAdmin = me.data?.roles.includes('SUPER_ADMIN') ?? false;
  const canReadDashboard = canViewDashboard({
    roles: me.data?.roles ?? [],
    permissions: me.data?.permissions ?? [],
  });

  if (me.isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  if (!canReadDashboard) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-navy-900">Dashboard access required</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your role does not include permission to view the clinic dashboard. Contact your clinic owner or
          administrator if you need access.
        </p>
      </Card>
    );
  }

  return <ClinicDashboard />;
}
