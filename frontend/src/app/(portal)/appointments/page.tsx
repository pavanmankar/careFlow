'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { api, getActiveLocationId } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { StaffAvatar } from '@/components/staff-avatar';
import { AppointmentStatus } from '@/components/appointment-status';
import { BookAppointmentModal } from '@/components/book-appointment-modal';
import { DateRangeCalendar, toYmd } from '@/components/date-range-calendar';
import { IconLink } from '@/components/ui/icon-button';
import { ListSearch, useAppliedSearch } from '@/components/list-search';
import { LocationRequiredBanner } from '@/components/location-required-banner';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  STATUS_COLORS,
  type ClinicAppointment,
  type ClinicDoctor,
  formatClinicDate,
  formatSlotLabel,
  hourInTimeZone,
  zonedLocalToUtcMs,
} from '@/lib/clinic';

interface Me {
  permissions: string[];
  business: { timezone: string } | null;
  locations?: Array<{ id: string }>;
}

interface StatusCount {
  status: string;
  total: number;
}

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  return toYmd(new Date(year, month - 1, day + days));
}

export default function AppointmentsPage() {
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const appliedSearch = useAppliedSearch(search);
  const [fromYmd, setFromYmd] = useState<string | null>(null);
  const [toYmd, setToYmd] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [bookOpen, setBookOpen] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    setPage(1);
  }, [appliedSearch]);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  const locationId = getActiveLocationId();
  const hasLocations = (me.data?.locations?.length ?? 0) > 0;
  const canBook = Boolean(locationId && hasLocations);
  const canCreate = (me.data?.permissions.includes('APPOINTMENT_CREATE') ?? false) && canBook;
  const canManageLocations = me.data?.permissions.includes('LOCATION_CREATE') ?? false;
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(DEFAULT_PAGE_SIZE),
    sortDirection: 'desc',
  });
  if (type !== 'all') {
    params.set('type', type);
  }
  if (status !== 'all') {
    params.set('status', status);
  }
  if (fromYmd) {
    params.set('from', String(zonedLocalToUtcMs(fromYmd, 0, timezone)));
  }
  if (toYmd) {
    params.set('to', String(zonedLocalToUtcMs(addDaysYmd(toYmd, 1), 0, timezone)));
  }
  if (appliedSearch) {
    params.set('search', appliedSearch);
  }
  const appointments = useQuery({
    queryKey: ['appointments', locationId, type, status, fromYmd, toYmd, page, appliedSearch],
    queryFn: () =>
      api.get<{ items: ClinicAppointment[]; total: number; statusCounts: StatusCount[] }>(
        `/api/v1/appointments?${params.toString()}`,
      ),
  });
  const doctors = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<{ items: ClinicDoctor[] }>('/api/v1/doctors'),
  });
  const items = appointments.data?.items ?? [];
  const statusCounts = appointments.data?.statusCounts ?? APPOINTMENT_STATUSES.map((item) => ({ status: item, total: 0 }));

  return (
    <div className="space-y-4">
      {!canBook ? <LocationRequiredBanner canManageLocations={canManageLocations} /> : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search patient"
            className="w-full min-w-[10rem] max-w-xs sm:w-48"
          />
          <DateRangeCalendar
            from={fromYmd}
            to={toYmd}
            label=""
            compact
            onChange={(next) => {
              setFromYmd(next.from);
              setToYmd(next.to);
              setPage(1);
            }}
          />
          <Select
            className="h-9 min-w-[8rem] flex-1 border-0 bg-white py-0 sm:w-36 sm:flex-none"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {APPOINTMENT_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select
            className="h-9 min-w-[8rem] flex-1 border-0 bg-white py-0 sm:w-36 sm:flex-none"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All status</option>
            {APPOINTMENT_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-max shrink-0 rounded-xl bg-slate-100 px-3 py-2.5">
            <div className="grid grid-cols-2">
              {statusCounts.map((row, index) => (
                <div
                  key={row.status}
                  className={`px-3 py-0.5 ${index % 2 === 0 ? 'border-r border-slate-200' : ''}`}
                >
                  <StatusCountButton
                    row={row}
                    active={status === row.status}
                    onClick={() => {
                      setStatus(status === row.status ? 'all' : row.status);
                      setPage(1);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {canCreate ? (
            <Button
              className="shrink-0"
              onClick={() => setBookOpen(true)}
              disabled={(doctors.data?.items.length ?? 0) === 0 || !canBook}
            >
              <Plus className="mr-2 h-4 w-4" />
              Book appointment
            </Button>
          ) : me.data?.permissions.includes('APPOINTMENT_CREATE') && !canBook ? (
            <Button className="shrink-0" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Book appointment
            </Button>
          ) : null}
        </div>
      </div>
      <DataTable loading={appointments.isLoading}>
        <TableHead>
          <tr>
            <Th>Patient</Th>
            <Th>Doctor</Th>
            <Th>Type</Th>
            <Th>Date</Th>
            <Th>Time</Th>
            <Th>Status</Th>
            <Th className="w-12" />
          </tr>
        </TableHead>
        <tbody>
          {items.map((row) => (
            <Tr key={row.id}>
              <Td>
                <div className="flex items-center gap-3 font-medium text-navy-900">
                  <StaffAvatar name={row.patient.name} />
                  {row.patient.name}
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-3">
                  <StaffAvatar name={row.doctor.name} size="sm" />
                  <span>
                    {row.doctor.name}
                    {row.doctor.specialty ? <span className="block text-xs text-slate-400">{row.doctor.specialty}</span> : null}
                  </span>
                </div>
              </Td>
              <Td>{row.type}</Td>
              <Td>{formatClinicDate(row.startsAt, timezone)}</Td>
              <Td>{formatSlotLabel(hourInTimeZone(row.startsAt, timezone))}</Td>
              <Td>
                <AppointmentStatus status={row.status} />
              </Td>
              <Td className="text-right">
                <IconLink href={`/appointments/${row.id}`} icon={Eye} label="View visit" />
              </Td>
            </Tr>
          ))}
          {!appointments.isLoading && items.length === 0 && (
            <Tr>
              <Td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                {appliedSearch
                  ? 'No appointments match that patient name.'
                  : 'No appointments yet. Book the first visit to get started.'}
              </Td>
            </Tr>
          )}
        </tbody>
      </DataTable>
      <Pagination page={page} total={appointments.data?.total ?? 0} onPageChange={setPage} />
      <BookAppointmentModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onBooked={() => {
          appointments.refetch();
          qc.invalidateQueries({ queryKey: ['patients'] });
        }}
      />
    </div>
  );
}

function StatusCountButton({
  row,
  active,
  onClick,
}: {
  row: StatusCount;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block whitespace-nowrap text-left text-sm font-medium ${active ? 'underline underline-offset-2' : ''}`}
      style={{ color: STATUS_COLORS[row.status] ?? '#0f2744' }}
    >
      {row.status}: {row.total}
    </button>
  );
}
