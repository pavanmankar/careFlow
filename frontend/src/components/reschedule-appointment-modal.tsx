'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-range-calendar';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  isSubscriptionRequiredError,
  SubscriptionRequiredModal,
} from '@/components/subscription-required';
import {
  type SlotOption,
  isPastSlot,
  isPastYmd,
  ymdInTimeZone,
} from '@/lib/clinic';

export function RescheduleAppointmentModal({
  open,
  onClose,
  onRescheduled,
  appointment,
  timezone = 'Asia/Kolkata',
}: {
  open: boolean;
  onClose: () => void;
  onRescheduled: () => void;
  appointment: {
    id: string;
    doctorUserId: string;
    startsAt: number;
    patientName?: string;
    doctorName?: string;
  } | null;
  timezone?: string;
}) {
  const today = ymdInTimeZone(Date.now(), timezone);
  const [date, setDate] = useState(today);
  const [startsAt, setStartsAt] = useState('');

  useEffect(() => {
    if (!open || !appointment) {
      return;
    }
    setDate(ymdInTimeZone(appointment.startsAt, timezone));
    setStartsAt(String(appointment.startsAt));
  }, [open, appointment, timezone]);

  const slots = useQuery({
    queryKey: ['doctor-slots', appointment?.doctorUserId, date, appointment?.id, 'reschedule'],
    queryFn: () =>
      api.get<{ items: SlotOption[] }>(
        `/api/v1/doctors/${appointment!.doctorUserId}/slots?date=${date}&excludeAppointmentId=${appointment!.id}`,
      ),
    enabled: open && Boolean(appointment?.doctorUserId && date),
  });

  useEffect(() => {
    const items = (slots.data?.items ?? []).filter((slot) => !isPastSlot(slot.startsAt));
    if (!items.length) {
      setStartsAt('');
      return;
    }
    setStartsAt((current) => {
      if (current && items.some((slot) => String(slot.startsAt) === current)) {
        return current;
      }
      if (appointment && items.some((slot) => slot.startsAt === appointment.startsAt)) {
        return String(appointment.startsAt);
      }
      return '';
    });
  }, [slots.data, appointment]);

  const save = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/appointments/${appointment!.id}/reschedule`, {
        startsAt: Number(startsAt),
      }),
    onSuccess: () => {
      onRescheduled();
      onClose();
    },
  });

  const subscriptionBlocked = isSubscriptionRequiredError(save.error);
  const error =
    save.error instanceof ApiClientError
      ? save.error.message
      : save.error
        ? 'Unable to reschedule appointment'
        : null;
  const slotList = (slots.data?.items ?? []).filter((slot) => !isPastSlot(slot.startsAt));
  const canSubmit = Boolean(date && startsAt && !isPastSlot(Number(startsAt)));

  return (
    <>
      <Modal
        open={open && Boolean(appointment) && !subscriptionBlocked}
        title="Reschedule appointment"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="reschedule-appointment-form"
              disabled={save.isPending || !canSubmit}
            >
              {save.isPending ? 'Saving…' : 'Save slot'}
            </Button>
          </div>
        }
      >
        {appointment ? (
          <form
            id="reschedule-appointment-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!date || isPastYmd(date, timezone)) {
                return;
              }
              if (!startsAt || isPastSlot(Number(startsAt))) {
                return;
              }
              save.mutate();
            }}
          >
            {(appointment.patientName || appointment.doctorName) && (
              <p className="text-sm text-slate-600">
                {[appointment.patientName, appointment.doctorName].filter(Boolean).join(' · ')}
              </p>
            )}
            <div>
              <Label required>Date</Label>
              <DatePicker
                value={date || null}
                onChange={(next) => setDate(next ?? '')}
                min={today}
                placeholder="Select date"
              />
            </div>
            <div>
              <Label required>Time</Label>
              <Select
                value={startsAt}
                disabled={!date || slots.isFetching}
                onChange={(event) => setStartsAt(event.target.value)}
              >
                <option value="">{slots.isFetching ? 'Loading times…' : 'Select time'}</option>
                {slotList.map((slot) => (
                  <option key={slot.startsAt} value={String(slot.startsAt)}>
                    {slot.label}
                  </option>
                ))}
              </Select>
              {date && !slots.isFetching && slotList.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  {isPastYmd(date, timezone) ? 'Cannot choose a past date.' : 'No open 1-hour slots on this date.'}
                </p>
              ) : null}
            </div>
            {error && !subscriptionBlocked ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        ) : null}
      </Modal>
      <SubscriptionRequiredModal
        open={open && subscriptionBlocked}
        onClose={() => {
          save.reset();
          onClose();
        }}
      />
    </>
  );
}
