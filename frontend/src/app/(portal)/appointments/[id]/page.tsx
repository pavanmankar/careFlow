'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FileDown, MoreVertical, Pencil, Pill, Plus, Stethoscope, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PortalLink, usePortalId } from '@/components/portal-navigation';
import { BackLink, IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { StaffAvatar } from '@/components/staff-avatar';
import { AppointmentStatus } from '@/components/appointment-status';
import { RescheduleAppointmentModal } from '@/components/reschedule-appointment-modal';
import { printVisitDocument, VisitMedicinesDocument, VisitSummaryDocument, type ClinicLetterhead } from '@/components/visit-summary-document';
import { api, ApiClientError } from '@/lib/api';
import { canOpenVisit, formatClinicDate, formatSlotLabel, hourInTimeZone } from '@/lib/clinic';
import {
  chargeTotals,
  computeBmi,
  emptyCharge,
  emptyDocument,
  emptyMedicine,
  rupees,
  type VisitCharge,
  type VisitDetail,
  type VisitDocument,
  type VisitMedicine,
  type VisitStatus,
} from '@/lib/visit';

const TIMELINE: VisitStatus[] = ['Confirmed', 'In progress', 'Completed'];

type ConfirmKind = 'check-in' | 'start' | 'complete' | 'save';

const CONFIRM: Record<ConfirmKind, { title: string; body: string; confirm: string }> = {
  'check-in': {
    title: 'Check in',
    body: 'Check this patient in? The visit status will change to In progress.',
    confirm: 'Check in',
  },
  start: {
    title: 'Start visit',
    body: 'Start this visit? The status will change to In progress.',
    confirm: 'Start visit',
  },
  complete: {
    title: 'Complete visit',
    body: 'Mark this visit as completed? The chart will be locked after this.',
    confirm: 'Complete',
  },
  save: {
    title: 'Save visit',
    body: 'Save the changes on this visit chart?',
    confirm: 'Save visit',
  },
};

interface Me {
  permissions: string[];
  business: { timezone: string } | null;
}

type FormState = {
  reasonForVisit: string;
  pastHistory: string;
  habits: string;
  internalNote: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  chronicConditions: string;
  currentMedicines: string;
  bpSystolic: string;
  bpDiastolic: string;
  pulse: string;
  temperature: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  examination: string;
  treatment: string;
  medicines: VisitMedicine[];
  documents: VisitDocument[];
  charges: VisitCharge[];
  taxPercent: string;
};

function fromVisit(visit: VisitDetail): FormState {
  return {
    reasonForVisit: visit.reasonForVisit ?? '',
    pastHistory: visit.pastHistory ?? '',
    habits: visit.habits ?? '',
    internalNote: visit.internalNote ?? '',
    emergencyContactName: visit.patient.emergencyContactName ?? '',
    emergencyContactPhone: visit.patient.emergencyContactPhone ?? '',
    allergies: visit.patient.allergies ?? '',
    chronicConditions: visit.patient.chronicConditions ?? '',
    currentMedicines: visit.patient.currentMedicines ?? '',
    bpSystolic: visit.vitals?.bpSystolic != null ? String(visit.vitals.bpSystolic) : '',
    bpDiastolic: visit.vitals?.bpDiastolic != null ? String(visit.vitals.bpDiastolic) : '',
    pulse: visit.vitals?.pulse != null ? String(visit.vitals.pulse) : '',
    temperature: visit.vitals?.temperature != null ? String(visit.vitals.temperature) : '',
    spo2: visit.vitals?.spo2 != null ? String(visit.vitals.spo2) : '',
    weightKg: visit.vitals?.weightKg != null ? String(visit.vitals.weightKg) : '',
    heightCm: visit.vitals?.heightCm != null ? String(visit.vitals.heightCm) : '',
    bmi: visit.vitals?.bmi != null ? String(visit.vitals.bmi) : '',
    examination: visit.procedures.examination ?? '',
    treatment: visit.procedures.treatment ?? '',
    medicines: visit.medicines,
    documents: visit.documents,
    charges: visit.charges,
    taxPercent: visit.taxPercent ? String(visit.taxPercent) : '',
  };
}

function toPayload(form: FormState) {
  return {
    reasonForVisit: form.reasonForVisit,
    pastHistory: form.pastHistory,
    habits: form.habits,
    internalNote: form.internalNote,
    patient: {
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      allergies: form.allergies,
      chronicConditions: form.chronicConditions,
      currentMedicines: form.currentMedicines,
    },
    vitals: {
      bpSystolic: intOrNull(form.bpSystolic),
      bpDiastolic: intOrNull(form.bpDiastolic),
      pulse: intOrNull(form.pulse),
      temperature: numOrNull(form.temperature),
      spo2: intOrNull(form.spo2),
      weightKg: numOrNull(form.weightKg),
      heightCm: numOrNull(form.heightCm),
      bmi: numOrNull(form.bmi),
    },
    procedures: { examination: form.examination, treatment: form.treatment },
    medicines: form.medicines.filter((item) => item.medicine.trim()),
    documents: form.documents.filter((item) => item.fileName.trim() && item.url.trim()),
    charges: form.charges.filter((item) => item.chargeFor.trim()),
    taxPercent: intOrNull(form.taxPercent) ?? 0,
  };
}

function intOrNull(value: string) {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? Math.round(n) : null;
}

function numOrNull(value: string) {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? n : null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy-900">{value || '—'}</dd>
    </div>
  );
}

function VisitMoreMenu({
  canBegin,
  canReschedule,
  disabled,
  onCheckIn,
  onStart,
  onReschedule,
}: {
  canBegin: boolean;
  canReschedule: boolean;
  disabled: boolean;
  onCheckIn: () => void;
  onStart: () => void;
  onReschedule: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white';

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        icon={MoreVertical}
        label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      />
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={disabled || !canReschedule}
            onClick={() => {
              setOpen(false);
              onReschedule();
            }}
          >
            Reschedule
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={disabled || !canBegin}
            onClick={() => {
              setOpen(false);
              onCheckIn();
            }}
          >
            Check in
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={disabled || !canBegin}
            onClick={() => {
              setOpen(false);
              onStart();
            }}
          >
            Start visit
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('space-y-3 p-4 sm:p-6', className)}>
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {children}
    </Card>
  );
}

export default function AppointmentDetailPage() {
  const id = usePortalId();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  const canUpdate = me.data?.permissions.includes('APPOINTMENT_UPDATE') ?? false;
  const visit = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get<VisitDetail>(`/api/v1/appointments/${id}`),
    enabled: Boolean(id),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [recentVisit, setRecentVisit] = useState<VisitDetail['recentVisits'][number] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmKind | null>(null);
  const [printKind, setPrintKind] = useState<null | 'summary' | 'medicines'>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const clinic = useQuery({
    queryKey: ['business'],
    queryFn: () => api.get<ClinicLetterhead>('/api/v1/business'),
    enabled: visit.data?.status === 'Completed' || printKind != null,
  });
  const [chargeIndex, setChargeIndex] = useState<number | null>(null);
  const [chargeDraft, setChargeDraft] = useState<VisitCharge | null>(null);
  const [medicineIndex, setMedicineIndex] = useState<number | null>(null);
  const [medicineDraft, setMedicineDraft] = useState<VisitMedicine | null>(null);
  const [documentIndex, setDocumentIndex] = useState<number | null>(null);
  const [documentDraft, setDocumentDraft] = useState<VisitDocument | null>(null);

  useEffect(() => {
    if (visit.data) {
      setForm(fromVisit(visit.data));
    }
  }, [visit.data]);

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.patch(`/api/v1/appointments/${id}`, payload),
    onSuccess: (data) => {
      qc.setQueryData(['appointment', id], data);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      setNotice('Visit saved.');
      setConfirmAction(null);
    },
  });

  const statusAct = useMutation({
    mutationFn: (action: 'check-in' | 'start' | 'complete' | 'cancel') =>
      api.post(`/api/v1/appointments/${id}/${action}`, action === 'cancel' ? { cancelReason } : {}),
    onSuccess: (data) => {
      qc.setQueryData(['appointment', id], data);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setCancelOpen(false);
      setCancelReason('');
      setConfirmAction(null);
      setNotice('Status updated.');
    },
  });

  const row = visit.data;
  const totals = useMemo(() => chargeTotals(form?.charges ?? [], Number(form?.taxPercent) || 0), [form?.charges, form?.taxPercent]);
  const error =
    save.error instanceof ApiClientError
      ? save.error.message
      : statusAct.error instanceof ApiClientError
        ? statusAct.error.message
        : save.error || statusAct.error
          ? 'Unable to update visit'
          : null;

  if (visit.isError) {
    return <p className="text-sm text-slate-500">Appointment not found.</p>;
  }
  if (!row || !form) {
    return <p className="text-sm text-slate-500">Loading visit…</p>;
  }

  const status = row.status;
  const cancelled = status === 'Cancelled';
  const expired = status === 'Expired';
  const completed = status === 'Completed';
  const locked = cancelled || expired || !canUpdate;

  const canBegin = status === 'Confirmed' && canOpenVisit(row);
  const canReschedule = status === 'Confirmed' && canUpdate;

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 lg:sticky lg:top-0 lg:z-10 lg:bg-canvas/95 lg:pb-3 lg:backdrop-blur">
        <BackLink href="/appointments" label={row.patient.name} heading className="mb-0">
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {status === 'In progress' ? (
              <Button type="button" disabled={locked || statusAct.isPending} onClick={() => setConfirmAction('complete')}>
                Complete
              </Button>
            ) : null}
            {completed ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setPrintKind('summary')}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download summary
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPrintKind('medicines')}>
                  <Pill className="mr-2 h-4 w-4" />
                  Download medicines
                </Button>
              </>
            ) : null}
            <Button type="button" variant="danger" disabled={completed || cancelled || expired || !canUpdate} onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
            <Button type="button" disabled={locked || save.isPending} onClick={() => setConfirmAction('save')}>
              {save.isPending ? 'Saving…' : 'Save visit'}
            </Button>
            <VisitMoreMenu
              canBegin={canBegin}
              canReschedule={canReschedule}
              disabled={locked || statusAct.isPending}
              onCheckIn={() => setConfirmAction('check-in')}
              onStart={() => setConfirmAction('start')}
              onReschedule={() => setRescheduleOpen(true)}
            />
          </div>
        </BackLink>
        <Card className="space-y-4 p-4 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <StaffAvatar name={row.patient.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-navy-900">{row.patient.name}</h2>
                <AppointmentStatus status={status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {row.patient.phone}
                {row.patient.gender ? ` · ${row.patient.gender}` : ''}
                {row.patient.bloodGroup ? ` · ${row.patient.bloodGroup}` : ''}
              </p>
              <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-600">
                <Stethoscope className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="break-words">
                  {row.doctor.name}
                  {row.doctor.specialty ? ` · ${row.doctor.specialty}` : ''} · {row.type}
                </span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {formatClinicDate(row.startsAt, timezone)} · {formatSlotLabel(hourInTimeZone(row.startsAt, timezone))}
              </p>
            </div>
          </div>
          {notice ? <p className="text-xs font-medium text-brand-700">{notice}</p> : null}
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="order-2 space-y-5 lg:col-span-4 xl:col-span-3">
          <Section title="Patient">
            <dl className="grid gap-3">
              <Field label="Name" value={row.patient.name} />
              <Field label="Phone" value={row.patient.phone} />
              <Field label="Gender" value={row.patient.gender ?? ''} />
              <Field label="Blood group" value={row.patient.bloodGroup ?? ''} />
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Emergency contact name</Label>
                <Input disabled={locked} value={form.emergencyContactName} onChange={(e) => patch('emergencyContactName', e.target.value)} />
              </div>
              <div>
                <Label>Emergency contact phone</Label>
                <Input disabled={locked} value={form.emergencyContactPhone} onChange={(e) => patch('emergencyContactPhone', e.target.value)} />
              </div>
            </div>
          </Section>
          <Section title="Medical notes">
            <Label>Allergies</Label>
            <Textarea disabled={locked} value={form.allergies} onChange={(e) => patch('allergies', e.target.value)} />
            <Label>Chronic conditions</Label>
            <Textarea disabled={locked} value={form.chronicConditions} onChange={(e) => patch('chronicConditions', e.target.value)} />
            <Label>Current medicines</Label>
            <Textarea disabled={locked} value={form.currentMedicines} onChange={(e) => patch('currentMedicines', e.target.value)} />
          </Section>
          <Section title="Last 3 visits">
            {row.recentVisits.length === 0 ? (
              <p className="text-sm text-slate-500">No earlier visits.</p>
            ) : (
              <ul className="space-y-2">
                {row.recentVisits.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-canvas px-3 py-2.5 text-left hover:bg-slate-100"
                      onClick={() => setRecentVisit(item)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-navy-900">{formatClinicDate(item.date, timezone)}</span>
                        <AppointmentStatus status={item.status} />
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.type} · {item.doctor}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{item.treatment || item.reasonForVisit || '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="order-1 space-y-5 lg:col-span-8 xl:col-span-6">
          <Section title="Appointment">
            <Label>Reason for visit</Label>
            <Textarea disabled={locked} value={form.reasonForVisit} onChange={(e) => patch('reasonForVisit', e.target.value)} />
            <Label>Past history</Label>
            <Textarea disabled={locked} value={form.pastHistory} onChange={(e) => patch('pastHistory', e.target.value)} />
            <Label>Habits</Label>
            <Textarea disabled={locked} value={form.habits} onChange={(e) => patch('habits', e.target.value)} />
          </Section>
          <Section title="Vitals">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label>BP systolic</Label>
                <Input disabled={locked} value={form.bpSystolic} onChange={(e) => patch('bpSystolic', e.target.value)} />
              </div>
              <div>
                <Label>BP diastolic</Label>
                <Input disabled={locked} value={form.bpDiastolic} onChange={(e) => patch('bpDiastolic', e.target.value)} />
              </div>
              <div>
                <Label>Pulse</Label>
                <Input disabled={locked} value={form.pulse} onChange={(e) => patch('pulse', e.target.value)} />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input disabled={locked} value={form.temperature} onChange={(e) => patch('temperature', e.target.value)} />
              </div>
              <div>
                <Label>SpO2</Label>
                <Input disabled={locked} value={form.spo2} onChange={(e) => patch('spo2', e.target.value)} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  disabled={locked}
                  value={form.weightKg}
                  onChange={(e) => {
                    const weightKg = e.target.value;
                    setForm((current) =>
                      current ? { ...current, weightKg, bmi: computeBmi(weightKg, current.heightCm) } : current,
                    );
                  }}
                />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input
                  disabled={locked}
                  value={form.heightCm}
                  onChange={(e) => {
                    const heightCm = e.target.value;
                    setForm((current) =>
                      current ? { ...current, heightCm, bmi: computeBmi(current.weightKg, heightCm) } : current,
                    );
                  }}
                />
              </div>
              <div>
                <Label>BMI</Label>
                <Input disabled={locked} value={form.bmi} onChange={(e) => patch('bmi', e.target.value)} />
              </div>
            </div>
          </Section>
          <Section title="Procedures">
            <Label>Examination</Label>
            <Textarea disabled={locked} value={form.examination} onChange={(e) => patch('examination', e.target.value)} />
            <Label>Treatment</Label>
            <Textarea disabled={locked} value={form.treatment} onChange={(e) => patch('treatment', e.target.value)} />
          </Section>
          <Section title="Medicines">
            <div className="space-y-2">
              {form.medicines.length === 0 ? (
                <p className="text-sm text-slate-500">No medicines yet.</p>
              ) : (
                <div className={cn('grid gap-2', form.medicines.length > 1 && 'grid-cols-1 sm:grid-cols-2')}>
                  {form.medicines.map((item, index) => (
                    <div key={item.id ?? `med-${index}`} className="rounded-xl border border-slate-100 bg-canvas px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (locked) {
                              return;
                            }
                            setMedicineIndex(index);
                            setMedicineDraft({ ...item });
                          }}
                        >
                          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Field label="Medicine" value={item.medicine} />
                            <Field label="Dose" value={item.dose} />
                            <Field label="Frequency" value={item.frequency} />
                            <Field label="Duration" value={item.duration} />
                            <div className="sm:col-span-2">
                              <Field label="Instructions" value={item.instructions} />
                            </div>
                          </dl>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={locked}
                            aria-label="Edit medicine"
                            onClick={() => {
                              setMedicineIndex(index);
                              setMedicineDraft({ ...item });
                            }}
                          >
                            <Pencil className="h-4 w-4 text-slate-400" />
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            aria-label="Remove medicine"
                            onClick={() => patch('medicines', form.medicines.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={locked}
                onClick={() => {
                  setMedicineIndex(-1);
                  setMedicineDraft(emptyMedicine());
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add medicine
              </Button>
            </div>
          </Section>
          <Section title="Documents">
            <div className="space-y-2">
              {form.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents yet.</p>
              ) : (
                <div className={cn('grid gap-2', form.documents.length > 1 && 'grid-cols-1 sm:grid-cols-2')}>
                  {form.documents.map((item, index) => (
                    <div key={item.id ?? `doc-${index}`} className="rounded-xl border border-slate-100 bg-canvas px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (locked) {
                              return;
                            }
                            setDocumentIndex(index);
                            setDocumentDraft({ ...item });
                          }}
                        >
                          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Field label="File name" value={item.fileName} />
                            <Field label="Kind" value={item.kind} />
                            <Field label="URL" value={item.url} />
                          </dl>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={locked}
                            aria-label="Edit document"
                            onClick={() => {
                              setDocumentIndex(index);
                              setDocumentDraft({ ...item });
                            }}
                          >
                            <Pencil className="h-4 w-4 text-slate-400" />
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            aria-label="Remove document"
                            onClick={() => patch('documents', form.documents.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={locked}
                onClick={() => {
                  setDocumentIndex(-1);
                  setDocumentDraft(emptyDocument());
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add document
              </Button>
            </div>
          </Section>
        </div>

        <div className="order-3 space-y-5 lg:col-span-4 xl:col-span-3">
          <Section title="Status">
            <ol className="space-y-3">
              {TIMELINE.map((step, index) => {
                const current = TIMELINE.indexOf(
                  status === 'Cancelled' || status === 'Expired' ? 'Confirmed' : status,
                );
                const done = index <= current && status !== 'Cancelled' && status !== 'Expired';
                return (
                  <li key={step} className="flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-brand-500' : 'bg-slate-200'}`} />
                    <span className={done ? 'font-medium text-navy-900' : 'text-slate-400'}>{step}</span>
                  </li>
                );
              })}
            </ol>
            {cancelled ? <p className="text-xs text-rose-600">Cancelled{row.cancelReason ? ` — ${row.cancelReason}` : ''}.</p> : null}
            {expired ? <p className="text-xs text-orange-700">Expired because the slot end time passed without check-in.</p> : null}
            <dl className="mt-3 grid gap-2">
              <Field label="Checked in at" value={row.checkedInAt ? formatClinicDate(row.checkedInAt, timezone) : ''} />
              <Field label="Started at" value={row.startedAt ? formatClinicDate(row.startedAt, timezone) : ''} />
              <Field label="Completed at" value={row.completedAt ? formatClinicDate(row.completedAt, timezone) : ''} />
            </dl>
            <Label>Internal note</Label>
            <Textarea disabled={locked} value={form.internalNote} onChange={(e) => patch('internalNote', e.target.value)} />
          </Section>
          <Section title="Charges">
            <div className="space-y-2">
              {form.charges.length === 0 ? (
                <p className="text-sm text-slate-500">No charges yet.</p>
              ) : (
                form.charges.map((item, index) => (
                  <div key={item.id ?? `ch-${index}`} className="rounded-xl border border-slate-100 bg-canvas px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          if (locked) {
                            return;
                          }
                          setChargeIndex(index);
                          setChargeDraft({ ...item });
                        }}
                      >
                        <dl className="grid gap-2">
                          <Field label="Charge for" value={item.chargeFor} />
                          <Field label="Amount" value={rupees(item.amount)} />
                        </dl>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={locked}
                          aria-label="Edit charge"
                          onClick={() => {
                            setChargeIndex(index);
                            setChargeDraft({ ...item });
                          }}
                        >
                          <Pencil className="h-4 w-4 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          disabled={locked}
                          aria-label="Remove charge"
                          onClick={() => patch('charges', form.charges.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={locked}
                onClick={() => {
                  setChargeIndex(-1);
                  setChargeDraft(emptyCharge());
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add charge
              </Button>
            </div>
            <div className="rounded-xl border border-slate-100 bg-canvas p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Summary</h4>
              <div className="mb-4">
                <Label>Tax (%)</Label>
                <div className="relative">
                  <Input
                    className="pr-8"
                    disabled={locked}
                    inputMode="numeric"
                    value={form.taxPercent}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      if (!raw) {
                        patch('taxPercent', '');
                        return;
                      }
                      patch('taxPercent', String(Math.min(100, Number(raw))));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">On total amount</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 text-slate-500">
                  <dt>Amount</dt>
                  <dd>{rupees(totals.amount)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-slate-500">
                  <dt>Tax{form.taxPercent ? ` (${form.taxPercent}%)` : ''}</dt>
                  <dd>{rupees(totals.tax)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 font-semibold text-navy-900">
                  <dt>Total amount</dt>
                  <dd>{rupees(totals.amountWithTax)}</dd>
                </div>
              </dl>
            </div>
          </Section>
        </div>
      </div>

      <Modal
        open={printKind != null}
        title={printKind === 'medicines' ? 'Medicines' : 'Visit summary'}
        onClose={() => setPrintKind(null)}
        className="max-w-[860px]"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPrintKind(null)}>
              Close
            </Button>
            <Button type="button" disabled={!clinic.data} onClick={() => printVisitDocument()}>
              Print / Save as PDF
            </Button>
          </div>
        }
      >
        {clinic.isError ? (
          <p className="text-sm text-rose-600">Unable to load clinic details for the letterhead.</p>
        ) : !clinic.data ? (
          <p className="text-sm text-slate-500">Loading clinic details…</p>
        ) : printKind === 'medicines' ? (
          <VisitMedicinesDocument visit={row} clinic={clinic.data} timezone={clinic.data.timezone ?? timezone} />
        ) : (
          <VisitSummaryDocument visit={row} clinic={clinic.data} timezone={clinic.data.timezone ?? timezone} />
        )}
      </Modal>

      <Modal
        open={documentDraft != null}
        title={documentIndex != null && documentIndex >= 0 ? 'Edit document' : 'Add document'}
        onClose={() => {
          setDocumentDraft(null);
          setDocumentIndex(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDocumentDraft(null);
                setDocumentIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!documentDraft?.fileName.trim() || !documentDraft?.url.trim()}
              onClick={() => {
                if (!documentDraft?.fileName.trim() || !documentDraft.url.trim()) {
                  return;
                }
                const next = { ...documentDraft, fileName: documentDraft.fileName.trim(), url: documentDraft.url.trim() };
                if (documentIndex != null && documentIndex >= 0) {
                  const documents = [...form.documents];
                  documents[documentIndex] = next;
                  patch('documents', documents);
                } else {
                  patch('documents', [...form.documents, next]);
                }
                setDocumentDraft(null);
                setDocumentIndex(null);
              }}
            >
              Save document
            </Button>
          </div>
        }
      >
        {documentDraft ? (
          <div className="grid gap-3">
            <div>
              <Label>File name</Label>
              <Input value={documentDraft.fileName} onChange={(e) => setDocumentDraft({ ...documentDraft, fileName: e.target.value })} />
            </div>
            <div>
              <Label>Kind</Label>
              <Select
                value={documentDraft.kind}
                onChange={(e) => setDocumentDraft({ ...documentDraft, kind: e.target.value as VisitDocument['kind'] })}
              >
                <option>Consent</option>
                <option>X-ray</option>
                <option>Photo</option>
              </Select>
            </div>
            <div>
              <Label>URL</Label>
              <Input value={documentDraft.url} onChange={(e) => setDocumentDraft({ ...documentDraft, url: e.target.value })} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={medicineDraft != null}
        title={medicineIndex != null && medicineIndex >= 0 ? 'Edit medicine' : 'Add medicine'}
        onClose={() => {
          setMedicineDraft(null);
          setMedicineIndex(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMedicineDraft(null);
                setMedicineIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!medicineDraft?.medicine.trim()}
              onClick={() => {
                if (!medicineDraft?.medicine.trim()) {
                  return;
                }
                const next = { ...medicineDraft, medicine: medicineDraft.medicine.trim() };
                if (medicineIndex != null && medicineIndex >= 0) {
                  const medicines = [...form.medicines];
                  medicines[medicineIndex] = next;
                  patch('medicines', medicines);
                } else {
                  patch('medicines', [...form.medicines, next]);
                }
                setMedicineDraft(null);
                setMedicineIndex(null);
              }}
            >
              Save medicine
            </Button>
          </div>
        }
      >
        {medicineDraft ? (
          <div className="grid gap-3">
            <div>
              <Label>Medicine</Label>
              <Input value={medicineDraft.medicine} onChange={(e) => setMedicineDraft({ ...medicineDraft, medicine: e.target.value })} />
            </div>
            <div>
              <Label>Dose</Label>
              <Input value={medicineDraft.dose} onChange={(e) => setMedicineDraft({ ...medicineDraft, dose: e.target.value })} />
            </div>
            <div>
              <Label>Frequency</Label>
              <Input value={medicineDraft.frequency} onChange={(e) => setMedicineDraft({ ...medicineDraft, frequency: e.target.value })} />
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={medicineDraft.duration} onChange={(e) => setMedicineDraft({ ...medicineDraft, duration: e.target.value })} />
            </div>
            <div>
              <Label>Instructions</Label>
              <Input value={medicineDraft.instructions} onChange={(e) => setMedicineDraft({ ...medicineDraft, instructions: e.target.value })} />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={chargeDraft != null}
        title={chargeIndex != null && chargeIndex >= 0 ? 'Edit charge' : 'Add charge'}
        onClose={() => {
          setChargeDraft(null);
          setChargeIndex(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setChargeDraft(null);
                setChargeIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!chargeDraft?.chargeFor.trim()}
              onClick={() => {
                if (!chargeDraft?.chargeFor.trim()) {
                  return;
                }
                const next = { ...chargeDraft, chargeFor: chargeDraft.chargeFor.trim() };
                if (chargeIndex != null && chargeIndex >= 0) {
                  const charges = [...form.charges];
                  charges[chargeIndex] = next;
                  patch('charges', charges);
                } else {
                  patch('charges', [...form.charges, next]);
                }
                setChargeDraft(null);
                setChargeIndex(null);
              }}
            >
              Save charge
            </Button>
          </div>
        }
      >
        {chargeDraft ? (
          <div className="grid gap-3">
            <div>
              <Label>Charge for</Label>
              <Input value={chargeDraft.chargeFor} onChange={(e) => setChargeDraft({ ...chargeDraft, chargeFor: e.target.value })} />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                inputMode="numeric"
                value={chargeDraft.amount || ''}
                onChange={(e) => setChargeDraft({ ...chargeDraft, amount: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(recentVisit)}
        title={recentVisit ? `${recentVisit.type} · ${formatClinicDate(recentVisit.date, timezone)}` : ''}
        onClose={() => setRecentVisit(null)}
      >
        {recentVisit ? (
          <div className="space-y-4">
            <dl className="grid gap-3">
              <Field label="Doctor" value={recentVisit.doctor} />
              <Field label="Status" value={recentVisit.status} />
              <Field label="Reason for visit" value={recentVisit.reasonForVisit ?? ''} />
              <Field label="Examination" value={recentVisit.examination ?? ''} />
              <Field label="Treatment" value={recentVisit.treatment ?? ''} />
            </dl>
            {recentVisit.medicines.length > 0 ? (
              <div>
                <h4 className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Medicines</h4>
                <ul className="mt-2 space-y-2">
                  {recentVisit.medicines.map((item, index) => (
                    <li key={index} className="rounded-xl bg-canvas px-3 py-2 text-sm text-navy-900">
                      <span className="font-medium">{item.medicine}</span>
                      {item.dose ? <span className="text-slate-500"> · {item.dose}</span> : null}
                      {item.frequency || item.duration ? (
                        <span className="block text-xs text-slate-500">
                          {[item.frequency, item.duration].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                      {item.instructions ? <span className="block text-xs text-slate-400">{item.instructions}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <PortalLink href={`/appointments/${recentVisit.id}`} className="text-sm font-medium text-brand-700">
              Open full visit
            </PortalLink>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmAction != null}
        title={confirmAction ? CONFIRM[confirmAction].title : ''}
        onClose={() => setConfirmAction(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={save.isPending || statusAct.isPending}
              onClick={() => {
                if (confirmAction === 'save') {
                  save.mutate(toPayload(form));
                  return;
                }
                if (confirmAction) {
                  statusAct.mutate(confirmAction);
                }
              }}
            >
              {save.isPending || statusAct.isPending ? 'Working…' : confirmAction ? CONFIRM[confirmAction].confirm : 'Confirm'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{confirmAction ? CONFIRM[confirmAction].body : ''}</p>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancel visit"
        onClose={() => setCancelOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep visit
            </Button>
            <Button type="button" variant="danger" disabled={statusAct.isPending} onClick={() => statusAct.mutate('cancel')}>
              Cancel visit
            </Button>
          </div>
        }
      >
        <Label>Reason</Label>
        <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
      </Modal>

      <RescheduleAppointmentModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        appointment={{
          id: row.id,
          doctorUserId: row.doctor.id,
          startsAt: row.startsAt,
          patientName: row.patient.name,
          doctorName: row.doctor.name,
        }}
        timezone={timezone}
        onRescheduled={() => {
          qc.invalidateQueries({ queryKey: ['appointment', id] });
          qc.invalidateQueries({ queryKey: ['appointments'] });
          setNotice('Appointment rescheduled.');
        }}
      />
    </div>
  );
}
