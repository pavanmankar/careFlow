'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiClientError, getActiveLocationId } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-range-calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  isSubscriptionRequiredError,
  SubscriptionRequiredModal,
} from '@/components/subscription-required';
import {
  APPOINTMENT_TYPES,
  BLOOD_GROUPS,
  type ClinicDoctor,
  type SlotOption,
  isPastSlot,
  isPastYmd,
  ymdInTimeZone,
} from '@/lib/clinic';

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  };
}

type BookForm = {
  name: string;
  phone: string;
  gender: string;
  bloodGroup: string;
  dateOfBirth: string;
  doctorUserId: string;
  type: string;
  date: string;
  startsAt: string;
};

export function BookAppointmentModal({
  open,
  onClose,
  onBooked,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  onBooked: () => void;
  prefill?: { date?: string; startsAt?: number; doctorUserId?: string };
}) {
  const qc = useQueryClient();
  const locationId = getActiveLocationId();
  const form = useForm<BookForm>({
    defaultValues: {
      name: '',
      phone: '',
      gender: '',
      bloodGroup: '',
      dateOfBirth: '',
      doctorUserId: '',
      type: 'Consultation',
      date: ymdInTimeZone(Date.now()),
      startsAt: '',
    },
  });
  const name = form.watch('name');
  const phone = form.watch('phone');
  const gender = form.watch('gender');
  const bloodGroup = form.watch('bloodGroup');
  const dateOfBirth = form.watch('dateOfBirth');
  const doctorUserId = form.watch('doctorUserId');
  const type = form.watch('type');
  const date = form.watch('date');
  const startsAt = form.watch('startsAt');
  const timezone = 'Asia/Kolkata';
  const today = ymdInTimeZone(Date.now(), timezone);

  const types = useQuery({
    queryKey: ['metadata', 'APPOINTMENT_TYPE'],
    queryFn: () => api.get<{ items: Array<{ code: string; name: string }> }>('/api/v1/metadata/APPOINTMENT_TYPE'),
    enabled: open,
  });
  const typeItems = types.data?.items?.length ? types.data.items : APPOINTMENT_TYPES.map((name) => ({ code: name, name }));

  const doctors = useQuery({
    queryKey: ['doctors', locationId],
    queryFn: () => api.get<{ items: ClinicDoctor[] }>('/api/v1/doctors'),
    enabled: open,
  });
  const slots = useQuery({
    queryKey: ['doctor-slots', locationId, doctorUserId, date],
    queryFn: () => api.get<{ items: SlotOption[] }>(`/api/v1/doctors/${doctorUserId}/slots?date=${date}`),
    enabled: open && Boolean(doctorUserId && date),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      name: '',
      phone: '',
      gender: '',
      bloodGroup: '',
      dateOfBirth: '',
      doctorUserId: prefill?.doctorUserId ?? '',
      type: 'Consultation',
      date: prefill?.date && !isPastYmd(prefill.date, timezone) ? prefill.date : ymdInTimeZone(Date.now(), timezone),
      startsAt: prefill?.startsAt && !isPastSlot(prefill.startsAt) ? String(prefill.startsAt) : '',
    });
  }, [open, prefill?.date, prefill?.startsAt, prefill?.doctorUserId, form, timezone]);

  useEffect(() => {
    const items = (slots.data?.items ?? []).filter((slot) => !isPastSlot(slot.startsAt));
    if (!items.length) {
      if (form.getValues('startsAt')) {
        form.setValue('startsAt', '');
      }
      return;
    }
    const current = form.getValues('startsAt');
    if (current && items.some((slot) => String(slot.startsAt) === current)) {
      return;
    }
    if (prefill?.startsAt && items.some((slot) => slot.startsAt === prefill.startsAt)) {
      form.setValue('startsAt', String(prefill.startsAt));
      return;
    }
    form.setValue('startsAt', '');
  }, [slots.data, prefill?.startsAt, form]);

  const save = useMutation({
    mutationFn: (values: BookForm) =>
      api.post('/api/v1/appointments', {
        doctorUserId: values.doctorUserId,
        type: values.type,
        startsAt: Number(values.startsAt),
        patient: {
          ...splitName(values.name),
          phone: values.phone,
          gender: values.gender,
          bloodGroup: values.bloodGroup,
          dateOfBirth: values.dateOfBirth,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['doctor-slots'] });
      onBooked();
      onClose();
    },
  });

  const error = save.error instanceof ApiClientError ? save.error.message : save.error ? 'Unable to book appointment' : null;
  const subscriptionBlocked = isSubscriptionRequiredError(save.error);
  const slotList = (slots.data?.items ?? []).filter((slot) => !isPastSlot(slot.startsAt));
  const canSubmit = Boolean(
    name.trim() &&
      phone.trim() &&
      gender &&
      bloodGroup &&
      dateOfBirth &&
      doctorUserId &&
      type &&
      date &&
      startsAt,
  );
  const dateError = form.formState.errors.date?.message;
  const timeError = form.formState.errors.startsAt?.message;
  const dobError = form.formState.errors.dateOfBirth?.message;

  return (
    <>
    <Modal
      open={open && !subscriptionBlocked}
      title="Book appointment"
      onClose={onClose}
      className="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="book-appointment-form" disabled={save.isPending || !canSubmit}>
            {save.isPending ? 'Booking…' : 'Confirm'}
          </Button>
        </div>
      }
    >
      <form
        id="book-appointment-form"
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          if (!values.dateOfBirth) {
            form.setError('dateOfBirth', { type: 'required', message: 'Select date of birth.' });
            return;
          }
          if (!values.date || isPastYmd(values.date, timezone)) {
            form.setError('date', { type: 'validate', message: 'Choose today or a future date.' });
            return;
          }
          if (!values.startsAt || isPastSlot(Number(values.startsAt))) {
            form.setError('startsAt', { type: 'validate', message: 'Choose a future time.' });
            return;
          }
          save.mutate(values);
        })}
      >
        <div>
          <Label required>Name</Label>
          <Input {...form.register('name', { required: true })} />
        </div>
        <div>
          <Label required>Phone</Label>
          <Input {...form.register('phone', { required: true })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label required>Gender</Label>
            <Select {...form.register('gender', { required: true })}>
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </Select>
          </div>
          <div>
            <Label required>Blood</Label>
            <Select {...form.register('bloodGroup', { required: true })}>
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Date of birth</Label>
            <DatePicker
              value={dateOfBirth || null}
              onChange={(next) => {
                form.setValue('dateOfBirth', next ?? '', { shouldValidate: true });
                form.clearErrors('dateOfBirth');
              }}
              max={today}
              placeholder="Select date"
            />
            {dobError ? <p className="mt-1 text-xs text-red-600">{dobError}</p> : null}
          </div>
        </div>
        <div>
          <Label required>Doctor</Label>
          <Select {...form.register('doctorUserId', { required: true })}>
            <option value="">Select doctor</option>
            {(doctors.data?.items ?? []).map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
                {doctor.specialty ? ` · ${doctor.specialty}` : ''}
              </option>
            ))}
          </Select>
          {!doctors.isLoading && (doctors.data?.items.length ?? 0) === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Assign the Doctor role to a staff member, or add it on My profile if you are the owner.
            </p>
          )}
        </div>
        <div>
          <Label required>Type</Label>
          <Select {...form.register('type', { required: true })}>
            {typeItems.map((item) => (
              <option key={item.code} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Date</Label>
            <DatePicker
              value={date || null}
              onChange={(next) => {
                form.setValue('date', next ?? '', { shouldValidate: true });
                form.clearErrors('date');
              }}
              min={today}
              placeholder="Select date"
            />
            {dateError ? <p className="mt-1 text-xs text-red-600">{dateError}</p> : null}
          </div>
          <div>
            <Label required>Time</Label>
            <Select
              {...form.register('startsAt', {
                required: true,
                validate: (value) => Boolean(value) && !isPastSlot(Number(value)) || 'Choose a future time.',
              })}
              disabled={!doctorUserId || slots.isFetching}
            >
              <option value="">{slots.isFetching ? 'Loading times…' : 'Select time'}</option>
              {slotList.map((slot) => (
                <option key={slot.startsAt} value={String(slot.startsAt)}>
                  {slot.label}
                </option>
              ))}
            </Select>
            {timeError ? <p className="mt-1 text-xs text-red-600">{timeError}</p> : null}
            {doctorUserId && !slots.isFetching && slotList.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {isPastYmd(date, timezone) ? 'Cannot book a past date.' : 'No open 1-hour slots on this date.'}
              </p>
            )}
          </div>
        </div>
        {error && !subscriptionBlocked && <p className="text-sm text-red-600">{error}</p>}
      </form>
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
