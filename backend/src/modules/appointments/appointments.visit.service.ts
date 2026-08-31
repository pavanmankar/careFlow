import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { ERROR_CODES } from '@/shared/types';
import { UpdateVisitInput } from '@/shared/validation';
import { createStamps, db, omitUndefined, updateStamp } from '@/db/client';
import {
  appointmentCharges,
  appointmentDocuments,
  appointmentMedicines,
  appointmentProcedures,
  appointmentVitals,
  appointments,
  patients,
} from '@/db/schema';
import { AppError } from '@/lib/errors';
import { expireOverdueConfirmedAppointments } from '@/jobs/expire-appointments';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function num(value: bigint | number | null | undefined) {
  return value == null ? null : Number(value);
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertWithinSlot(startsAt: bigint, endsAt: bigint, now: bigint) {
  if (now < startsAt) {
    throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'Visit can be opened only during the appointment slot.', 409);
  }
  if (now >= endsAt) {
    throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'This appointment slot has ended.', 409);
  }
}

export async function getVisit(id: string, tenantId: string) {
  await expireOverdueConfirmedAppointments();
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
    with: {
      patient: true,
      doctor: { with: { doctorProfile: true } },
    },
  });
  if (!row) {
    throw new AppError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }

  const [vitalsRow, procedureRow, medicineRows, documentRows, chargeRows, recent] = await Promise.all([
    db.query.appointmentVitals.findFirst({
      where: and(eq(appointmentVitals.appointmentId, id), eq(appointmentVitals.tenantId, tenantId), isNull(appointmentVitals.deletedAt)),
    }),
    db.query.appointmentProcedures.findFirst({
      where: and(eq(appointmentProcedures.appointmentId, id), eq(appointmentProcedures.tenantId, tenantId), isNull(appointmentProcedures.deletedAt)),
    }),
    db.query.appointmentMedicines.findMany({
      where: and(eq(appointmentMedicines.appointmentId, id), eq(appointmentMedicines.tenantId, tenantId), isNull(appointmentMedicines.deletedAt)),
    }),
    db.query.appointmentDocuments.findMany({
      where: and(eq(appointmentDocuments.appointmentId, id), eq(appointmentDocuments.tenantId, tenantId), isNull(appointmentDocuments.deletedAt)),
    }),
    db.query.appointmentCharges.findMany({
      where: and(eq(appointmentCharges.appointmentId, id), eq(appointmentCharges.tenantId, tenantId), isNull(appointmentCharges.deletedAt)),
    }),
    loadRecentVisits(tenantId, row.patientId, row.id),
  ]);

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reasonForVisit: row.reasonForVisit,
    pastHistory: row.pastHistory,
    habits: row.habits,
    internalNote: row.internalNote,
    cancelReason: row.cancelReason,
    taxPercent: row.taxPercent || chargeRows.find((item) => item.tax > 0)?.tax || 0,
    checkedInAt: row.checkedInAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    patient: {
      id: row.patient.id,
      firstName: row.patient.firstName,
      lastName: row.patient.lastName,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      phone: row.patient.phone,
      gender: row.patient.gender,
      bloodGroup: row.patient.bloodGroup,
      dateOfBirth: row.patient.dateOfBirth ? row.patient.dateOfBirth.getTime() : null,
      emergencyContactName: row.patient.emergencyContactName,
      emergencyContactPhone: row.patient.emergencyContactPhone,
      allergies: row.patient.allergies,
      chronicConditions: row.patient.chronicConditions,
      currentMedicines: row.patient.currentMedicines,
    },
    doctor: {
      id: row.doctor.id,
      name: `${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
      specialty: row.doctor.doctorProfile?.specialty || '',
    },
    recentVisits: recent,
    vitals: vitalsRow
      ? {
          bpSystolic: vitalsRow.bpSystolic,
          bpDiastolic: vitalsRow.bpDiastolic,
          pulse: vitalsRow.pulse,
          temperature: vitalsRow.temperature,
          spo2: vitalsRow.spo2,
          weightKg: vitalsRow.weightKg,
          heightCm: vitalsRow.heightCm,
          bmi: vitalsRow.bmi,
          recordedAt: vitalsRow.recordedAt,
        }
      : null,
    procedures: procedureRow
      ? { examination: procedureRow.examination, treatment: procedureRow.treatment }
      : { examination: null, treatment: null },
    medicines: medicineRows.map((item) => ({
      id: item.id,
      medicine: item.medicine,
      dose: item.dose,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
    documents: documentRows.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      kind: item.kind,
      url: item.url,
    })),
    charges: chargeRows.map((item) => ({
      id: item.id,
      chargeFor: item.chargeFor,
      amount: item.amount,
    })),
  };
}

export async function saveVisit(id: string, tenantId: string, actorId: string, input: UpdateVisitInput) {
  const current = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
  });
  if (!current) {
    throw new AppError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }

  const now = BigInt(utcNowMs());
  await db.transaction(async (tx) => {
    await tx
      .update(appointments)
      .set(
        omitUndefined({
          reasonForVisit: input.reasonForVisit !== undefined ? emptyToNull(input.reasonForVisit) : undefined,
          pastHistory: input.pastHistory !== undefined ? emptyToNull(input.pastHistory) : undefined,
          habits: input.habits !== undefined ? emptyToNull(input.habits) : undefined,
          internalNote: input.internalNote !== undefined ? emptyToNull(input.internalNote) : undefined,
          taxPercent: input.taxPercent,
          updatedBy: actorId,
          ...updateStamp(),
        }),
      )
      .where(eq(appointments.id, id));

    if (input.patient) {
      await tx
        .update(patients)
        .set({
          emergencyContactName: emptyToNull(input.patient.emergencyContactName ?? undefined),
          emergencyContactPhone: emptyToNull(input.patient.emergencyContactPhone ?? undefined),
          allergies: emptyToNull(input.patient.allergies ?? undefined),
          chronicConditions: emptyToNull(input.patient.chronicConditions ?? undefined),
          currentMedicines: emptyToNull(input.patient.currentMedicines ?? undefined),
          updatedBy: actorId,
          ...updateStamp(),
        })
        .where(eq(patients.id, current.patientId));
    }

    if (input.vitals) {
      await upsertVitals(tx, tenantId, id, actorId, now, input.vitals);
    }
    if (input.procedures) {
      await upsertProcedures(tx, tenantId, id, actorId, now, input.procedures);
    }
    if (input.medicines) {
      await replaceRows({
        tx,
        table: appointmentMedicines,
        tenantId,
        appointmentId: id,
        actorId,
        now,
        incoming: input.medicines,
        mapInsert: (item) => ({
          medicine: item.medicine.trim(),
          dose: emptyToNull(item.dose ?? undefined),
          frequency: emptyToNull(item.frequency ?? undefined),
          duration: emptyToNull(item.duration ?? undefined),
          instructions: emptyToNull(item.instructions ?? undefined),
        }),
      });
    }
    if (input.documents) {
      await replaceRows({
        tx,
        table: appointmentDocuments,
        tenantId,
        appointmentId: id,
        actorId,
        now,
        incoming: input.documents,
        mapInsert: (item) => ({
          fileName: item.fileName.trim(),
          kind: item.kind,
          url: item.url.trim(),
        }),
      });
    }
    if (input.charges) {
      await replaceRows({
        tx,
        table: appointmentCharges,
        tenantId,
        appointmentId: id,
        actorId,
        now,
        incoming: input.charges,
        mapInsert: (item) => ({
          chargeFor: item.chargeFor.trim(),
          amount: item.amount,
          tax: 0,
          amountWithTax: item.amount,
        }),
      });
    }
  });

  return getVisit(id, tenantId);
}

export async function setVisitStatus(
  id: string,
  tenantId: string,
  actorId: string,
  action: 'check-in' | 'start' | 'complete' | 'cancel',
  cancelReason?: string | null,
) {
  await expireOverdueConfirmedAppointments();
  const row = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
  });
  if (!row) {
    throw new AppError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  const now = BigInt(utcNowMs());
  const patch: Record<string, unknown> = { updatedBy: actorId, ...updateStamp() };

  if (action === 'check-in') {
    if (row.status !== 'Confirmed') {
      throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'Only confirmed visits can be checked in.', 409);
    }
    assertWithinSlot(row.startsAt, row.endsAt, now);
    patch.status = 'In progress';
    patch.checkedInAt = now;
    if (!row.startedAt) {
      patch.startedAt = now;
    }
  } else if (action === 'start') {
    if (row.status !== 'Confirmed') {
      throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'Only confirmed visits can be started.', 409);
    }
    assertWithinSlot(row.startsAt, row.endsAt, now);
    patch.status = 'In progress';
    patch.startedAt = now;
  } else if (action === 'complete') {
    if (row.status !== 'In progress') {
      throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'Start the visit before completing it.', 409);
    }
    patch.status = 'Completed';
    patch.completedAt = now;
  } else {
    if (row.status === 'Completed' || row.status === 'Cancelled' || row.status === 'Expired') {
      throw new AppError(ERROR_CODES.APPOINTMENT_STATUS, 'This visit cannot be cancelled.', 409);
    }
    patch.status = 'Cancelled';
    patch.cancelReason = emptyToNull(cancelReason ?? undefined);
  }

  await db.update(appointments).set(patch).where(eq(appointments.id, id));
  return getVisit(id, tenantId);
}

async function loadRecentVisits(tenantId: string, patientId: string, currentId: string) {
  const rows = await db.query.appointments.findMany({
    where: and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.patientId, patientId),
      ne(appointments.id, currentId),
      isNull(appointments.deletedAt),
    ),
    with: {
      doctor: true,
      procedures: true,
      medicines: true,
    },
    orderBy: desc(appointments.startsAt),
    limit: 3,
  });
  return rows.map((row) => ({
    id: row.id,
    date: num(row.startsAt),
    type: row.type,
    status: row.status,
    doctor: `${row.doctor.firstName} ${row.doctor.lastName}`.trim(),
    reasonForVisit: row.reasonForVisit,
    examination: row.procedures?.examination ?? null,
    treatment: row.procedures?.treatment ?? null,
    medicines: row.medicines.map((item) => ({
      medicine: item.medicine,
      dose: item.dose,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
  }));
}

async function upsertVitals(
  tx: Tx,
  tenantId: string,
  appointmentId: string,
  actorId: string,
  now: bigint,
  vitals: NonNullable<UpdateVisitInput['vitals']>,
) {
  const existing = await tx
    .select()
    .from(appointmentVitals)
    .where(and(eq(appointmentVitals.appointmentId, appointmentId), eq(appointmentVitals.tenantId, tenantId)))
    .then((rows) => rows[0]);
  const values = {
    bpSystolic: vitals.bpSystolic ?? null,
    bpDiastolic: vitals.bpDiastolic ?? null,
    pulse: vitals.pulse ?? null,
    temperature: vitals.temperature ?? null,
    spo2: vitals.spo2 ?? null,
    weightKg: vitals.weightKg ?? null,
    heightCm: vitals.heightCm ?? null,
    bmi: vitals.bmi ?? computeBmi(vitals.weightKg, vitals.heightCm),
    recordedAt: vitals.recordedAt != null ? BigInt(vitals.recordedAt) : now,
    updatedBy: actorId,
    updatedAt: now,
    deletedAt: null,
  };
  if (existing) {
    await tx.update(appointmentVitals).set(values).where(eq(appointmentVitals.id, existing.id));
    return;
  }
  await tx.insert(appointmentVitals).values({
    id: ULID.random(),
    tenantId,
    appointmentId,
    createdBy: actorId,
    createdAt: now,
    ...values,
  });
}

async function upsertProcedures(
  tx: Tx,
  tenantId: string,
  appointmentId: string,
  actorId: string,
  now: bigint,
  procedures: NonNullable<UpdateVisitInput['procedures']>,
) {
  const existing = await tx
    .select()
    .from(appointmentProcedures)
    .where(and(eq(appointmentProcedures.appointmentId, appointmentId), eq(appointmentProcedures.tenantId, tenantId)))
    .then((rows) => rows[0]);
  const values = {
    examination: emptyToNull(procedures.examination ?? undefined),
    treatment: emptyToNull(procedures.treatment ?? undefined),
    updatedBy: actorId,
    updatedAt: now,
    deletedAt: null,
  };
  if (existing) {
    await tx.update(appointmentProcedures).set(values).where(eq(appointmentProcedures.id, existing.id));
    return;
  }
  await tx.insert(appointmentProcedures).values({
    id: ULID.random(),
    tenantId,
    appointmentId,
    createdBy: actorId,
    createdAt: now,
    ...values,
  });
}

async function replaceRows<T extends { id?: string }>({
  tx,
  table,
  tenantId,
  appointmentId,
  actorId,
  now,
  incoming,
  mapInsert,
}: {
  tx: Tx;
  table: typeof appointmentMedicines | typeof appointmentDocuments | typeof appointmentCharges;
  tenantId: string;
  appointmentId: string;
  actorId: string;
  now: bigint;
  incoming: T[];
  mapInsert: (item: T) => Record<string, unknown>;
}) {
  const existing = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.appointmentId, appointmentId), eq(table.tenantId, tenantId), isNull(table.deletedAt)));
  const keep = new Set(incoming.map((item) => item.id).filter(Boolean) as string[]);
  const remove = existing.filter((row) => !keep.has(row.id)).map((row) => row.id);
  if (remove.length) {
    await tx
      .update(table)
      .set({ deletedAt: new Date(), updatedBy: actorId, updatedAt: now })
      .where(inArray(table.id, remove));
  }
  for (const item of incoming) {
    const fields = mapInsert(item);
    if (item.id && keep.has(item.id)) {
      await tx
        .update(table)
        .set({ ...fields, updatedBy: actorId, updatedAt: now })
        .where(and(eq(table.id, item.id), eq(table.appointmentId, appointmentId)));
      continue;
    }
    await tx.insert(table).values({
      id: ULID.random(),
      tenantId,
      appointmentId,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
      ...fields,
    } as never);
  }
}

function computeBmi(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) {
    return null;
  }
  const meters = heightCm / 100;
  if (meters <= 0) {
    return null;
  }
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}
