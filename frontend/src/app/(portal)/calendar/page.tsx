'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api, getActiveLocationId } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { StaffAvatar } from '@/components/staff-avatar';
import { AppointmentStatus } from '@/components/appointment-status';
import { BookAppointmentModal } from '@/components/book-appointment-modal';
import { RescheduleAppointmentModal } from '@/components/reschedule-appointment-modal';
import { PortalLink } from '@/components/portal-navigation';
import { LocationRequiredBanner } from '@/components/location-required-banner';
import {
  APPOINTMENT_STATUSES,
  CLINIC_START_HOURS,
  statusColor,
  type ClinicAppointment,
  type ClinicDoctor,
  formatClinicDate,
  formatSlotLabel,
  hourInTimeZone,
  canOpenVisit,
  isPastSlot,
  isPastYmd,
  ymdInTimeZone,
  zonedLocalToUtcMs,
} from '@/lib/clinic';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Me {
  business: { timezone: string } | null;
  permissions: string[];
  locations?: Array<{ id: string }>;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekStart(date: Date) {
  return addDays(date, -date.getDay());
}

async function fetchCalendarAppointments(base: URLSearchParams) {
  const params = new URLSearchParams(base);
  const pageSize = 500;
  params.set('pageSize', String(pageSize));
  params.set('sortDirection', 'asc');
  params.set('page', '1');
  const first = await api.get<{ items: ClinicAppointment[]; total: number }>(`/api/v1/appointments?${params.toString()}`);
  const items = [...first.items];
  const total = first.total;
  let page = 2;
  while (items.length < total) {
    params.set('page', String(page));
    const next = await api.get<{ items: ClinicAppointment[]; total: number }>(`/api/v1/appointments?${params.toString()}`);
    if (!next.items.length) {
      break;
    }
    items.push(...next.items);
    page += 1;
  }
  return { items, total };
}

export default function CalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [doctorId, setDoctorId] = useState('');
  const [book, setBook] = useState<{ date: string; startsAt?: number; doctorUserId?: string } | null>(null);
  const [viewing, setViewing] = useState<ClinicAppointment | null>(null);
  const [reschedule, setReschedule] = useState<ClinicAppointment | null>(null);

  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  const locationId = getActiveLocationId();
  const hasLocations = (me.data?.locations?.length ?? 0) > 0;
  const canBook = Boolean(locationId && hasLocations);
  const canCreate = (me.data?.permissions.includes('APPOINTMENT_CREATE') ?? false) && canBook;
  const canUpdate = (me.data?.permissions.includes('APPOINTMENT_UPDATE') ?? false) && canBook;
  const canManageLocations = me.data?.permissions.includes('LOCATION_CREATE') ?? false;
  const doctors = useQuery({
    queryKey: ['doctors', locationId],
    queryFn: () => api.get<{ items: ClinicDoctor[] }>('/api/v1/doctors'),
  });
  const allDoctors = !doctorId;

  const range = useMemo(() => {
    if (view === 'Day') {
      const start = new Date(selected);
      start.setHours(0, 0, 0, 0);
      return { from: start.getTime() - 12 * 60 * 60 * 1000, to: start.getTime() + 36 * 60 * 60 * 1000 };
    }
    if (view === 'Week') {
      const start = weekStart(selected);
      start.setHours(0, 0, 0, 0);
      return { from: start.getTime() - 12 * 60 * 60 * 1000, to: addDays(start, 8).getTime() };
    }
    const start = startOfMonth(cursor);
    return { from: addDays(start, -7).getTime(), to: addDays(start, 40).getTime() };
  }, [view, selected, cursor]);

  const params = new URLSearchParams({
    from: String(range.from),
    to: String(range.to),
  });
  if (doctorId) {
    params.set('doctorUserId', doctorId);
  }

  const appointments = useQuery({
    queryKey: ['appointments', 'calendar', locationId, doctorId, range.from, range.to],
    queryFn: () => fetchCalendarAppointments(params),
  });
  const items = (appointments.data?.items ?? []).filter((row) => row.status !== 'Cancelled');

  function appointmentsOn(date: Date) {
    const ymd = ymdInTimeZone(date.getTime(), timezone);
    return items.filter((row) => ymdInTimeZone(row.startsAt, timezone) === ymd);
  }

  function appointmentsAt(date: Date, hour: number) {
    return appointmentsOn(date).filter((row) => hourInTimeZone(row.startsAt, timezone) === hour);
  }

  function openBook(date: Date, hour?: number) {
    if (!canCreate || !canBook) {
      return;
    }
    const ymd = ymdInTimeZone(date.getTime(), timezone);
    if (hour == null) {
      if (isPastYmd(ymd, timezone)) {
        return;
      }
    } else if (isPastSlot(zonedLocalToUtcMs(ymd, hour, timezone))) {
      return;
    }
    setBook({
      date: ymd,
      doctorUserId: doctorId || undefined,
      startsAt: hour == null ? undefined : zonedLocalToUtcMs(ymd, hour, timezone),
    });
  }

  function isPastHour(date: Date, hour: number) {
    const ymd = ymdInTimeZone(date.getTime(), timezone);
    return isPastSlot(zonedLocalToUtcMs(ymd, hour, timezone));
  }

  function shift(amount: number) {
    if (view === 'Month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1));
      return;
    }
    const next = addDays(selected, view === 'Week' ? amount * 7 : amount);
    setSelected(next);
    setCursor(next);
  }

  const monthStart = startOfMonth(cursor);
  const monthDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const pad = monthStart.getDay();
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart(selected), index));
  const heading =
    view === 'Month'
      ? cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : view === 'Week'
        ? `${weekDays[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function HourRows({ date }: { date: Date }) {
    return (
      <ul className="space-y-2">
        {CLINIC_START_HOURS.map((hour) => {
          const booked = appointmentsAt(date, hour);
          const past = isPastHour(date, hour);
          return (
            <li key={`${date.toDateString()}-${hour}`} className="space-y-1">
              {booked.length === 0 ? (
                <button
                  type="button"
                  disabled={past || !canCreate}
                  onClick={() => openBook(date, hour)}
                  className="flex w-full items-center gap-3 rounded-xl bg-canvas px-4 py-3 text-left hover:bg-brand-50 disabled:cursor-not-allowed disabled:hover:bg-canvas"
                >
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-500">{formatSlotLabel(hour)}</span>
                  <span className="text-sm text-slate-400">{past ? 'Past' : 'Free'}</span>
                </button>
              ) : (
                <>
                  {booked.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setViewing(row)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-white"
                      style={{ background: statusColor(row.status) }}
                    >
                      <span className="w-28 shrink-0 text-xs font-medium text-white/80">{formatSlotLabel(hour)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{row.patient.name}</span>
                        <span className="text-xs text-white/80">
                          {row.type}
                          {allDoctors ? ` · ${row.doctor.name}` : ''}
                          {` · ${row.status}`}
                        </span>
                      </span>
                    </button>
                  ))}
                  {allDoctors && canCreate && !past && (
                    <button
                      type="button"
                      onClick={() => openBook(date, hour)}
                      className="flex w-full items-center gap-3 rounded-xl bg-canvas px-4 py-2 text-left hover:bg-brand-50"
                    >
                      <span className="w-28 shrink-0 text-xs font-medium text-slate-500">{formatSlotLabel(hour)}</span>
                      <span className="text-sm text-slate-400">Book another doctor</span>
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {!canBook ? <LocationRequiredBanner canManageLocations={canManageLocations} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(15,39,68,0.05)]">
          {(['Month', 'Week', 'Day'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                view === option ? 'bg-brand-500 text-white' : 'text-slate-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="px-2.5" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center text-sm font-semibold text-navy-900">{heading}</div>
          <Button type="button" variant="secondary" className="px-2.5" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select className="w-52 border-0 bg-white" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
          <option value="">All doctors</option>
          {(doctors.data?.items ?? []).map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {APPOINTMENT_STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(status) }} />
            {status}
          </span>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="relative xl:col-span-8">
          {appointments.isLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/75">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : null}
          {view === 'Day' ? (
            <HourRows date={selected} />
          ) : view === 'Week' ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[720px] grid-cols-8 gap-2">
                <div />
                {weekDays.map((day) => (
                  <div key={day.toDateString()} className="text-center text-xs font-medium text-slate-500">
                    {weekdays[day.getDay()]} {day.getDate()}
                  </div>
                ))}
                {CLINIC_START_HOURS.map((hour) => (
                  <div key={`row-${hour}`} className="contents">
                    <div className="py-2 text-xs text-slate-400">{formatSlotLabel(hour)}</div>
                    {weekDays.map((day) => {
                      const booked = appointmentsAt(day, hour);
                      const first = booked[0];
                      const past = isPastHour(day, hour);
                      return (
                        <button
                          key={`${day.toDateString()}-${hour}`}
                          type="button"
                          disabled={past && booked.length === 0}
                          onClick={() => {
                            setSelected(day);
                            if (booked.length === 0) {
                              openBook(day, hour);
                            } else if (booked.length === 1) {
                              setViewing(first);
                            }
                          }}
                          className={`min-h-12 rounded-xl px-1.5 py-1 text-left text-[9px] disabled:cursor-not-allowed ${
                            first ? 'text-white' : past ? 'bg-canvas text-slate-300' : 'bg-canvas text-slate-400 hover:bg-brand-50'
                          }`}
                          style={first ? { background: statusColor(first.status) } : undefined}
                        >
                          {booked.length === 0
                            ? past
                              ? 'Past'
                              : 'Free'
                            : booked.length === 1
                              ? `${first.patient.name}${allDoctors ? ` · ${first.doctor.name}` : ''}`
                              : `${booked.length} visits`}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium uppercase text-slate-400">
                {weekdays.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: pad }).map((_, index) => (
                  <div key={`pad-${index}`} />
                ))}
                {Array.from({ length: monthDays }, (_, index) => {
                  const day = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1);
                  const events = appointmentsOn(day);
                  const isSelected = sameDay(day, selected);
                  const pastDay = isPastYmd(ymdInTimeZone(day.getTime(), timezone), timezone);
                  return (
                    <button
                      key={day.toDateString()}
                      type="button"
                      onClick={() => {
                        setSelected(day);
                        if (events.length === 0 && !pastDay) {
                          openBook(day);
                        }
                      }}
                      className={`min-h-24 rounded-xl border border-slate-100 p-2 text-left text-sm ${
                        isSelected ? 'bg-mint/60' : pastDay ? 'bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium text-navy-900">{index + 1}</div>
                      <div className="mt-1 space-y-1">
                        {events.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="truncate rounded-md px-1.5 py-0.5 text-[8px] font-medium text-white"
                            style={{ background: statusColor(event.status) }}
                          >
                            {event.patient.name}
                            {allDoctors ? ` · ${event.doctor.name}` : ''}
                          </div>
                        ))}
                        {events.length > 2 && <div className="text-[8px] text-slate-400">+{events.length - 2} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
        <div className="space-y-4 xl:col-span-4">
          <h2 className="text-sm font-semibold text-navy-900">
            {selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} schedule
          </h2>
          {view === 'Day' ? (
            <p className="text-sm text-slate-500">Use the hourly list on the left to book or view a visit.</p>
          ) : (
            <HourRows date={selected} />
          )}
        </div>
      </div>
      <BookAppointmentModal
        open={Boolean(book)}
        onClose={() => setBook(null)}
        prefill={book ?? undefined}
        onBooked={() => {
          qc.invalidateQueries({ queryKey: ['appointments'] });
          qc.invalidateQueries({ queryKey: ['patients'] });
        }}
      />
      <RescheduleAppointmentModal
        open={Boolean(reschedule)}
        onClose={() => setReschedule(null)}
        appointment={
          reschedule
            ? {
                id: reschedule.id,
                doctorUserId: reschedule.doctor.id,
                startsAt: reschedule.startsAt,
                patientName: reschedule.patient.name,
                doctorName: reschedule.doctor.name,
              }
            : null
        }
        timezone={timezone}
        onRescheduled={() => {
          qc.invalidateQueries({ queryKey: ['appointments'] });
          setViewing(null);
        }}
      />
      <Modal
        open={Boolean(viewing)}
        title="Appointment"
        onClose={() => setViewing(null)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {viewing && viewing.status === 'Confirmed' && canUpdate ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReschedule(viewing);
                  setViewing(null);
                }}
              >
                Reschedule
              </Button>
            ) : null}
            {viewing && canOpenVisit(viewing) ? (
              <PortalLink
                href={`/appointments/${viewing.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
                onClick={() => setViewing(null)}
              >
                Open visit
              </PortalLink>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StaffAvatar name={viewing.patient.name} />
              <div>
                <div className="font-medium text-navy-900">{viewing.patient.name}</div>
                <div className="text-sm text-slate-500">{viewing.patient.phone}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {formatClinicDate(viewing.startsAt, timezone)} · {formatSlotLabel(hourInTimeZone(viewing.startsAt, timezone))}
            </p>
            <p className="text-sm text-slate-600">
              {viewing.doctor.name}
              {viewing.doctor.specialty ? ` · ${viewing.doctor.specialty}` : ''}
            </p>
            <p className="text-sm text-slate-600">{viewing.type}</p>
            <AppointmentStatus status={viewing.status} />
            {viewing.status === 'Confirmed' && !canOpenVisit(viewing) ? (
              <p className="text-xs text-slate-500">Visit can be opened only during the appointment slot.</p>
            ) : null}
            {viewing.status === 'Expired' ? (
              <p className="text-xs text-orange-700">This appointment expired. The visit cannot be opened.</p>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
