import { Router } from 'express';
import { appointmentQuerySchema, cancelAppointmentSchema, createAppointmentSchema, rescheduleAppointmentSchema, updateVisitSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { requireSubcriptionAccess } from '@/middleware/subscription';
import { PERMISSION_CODES } from '@/shared/types';
import * as appointments from './appointments.service';
import * as visit from './appointments.visit.service';
import { auditFromReq } from '@/lib/audit';
import { getRequestContext } from '@/lib/context';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';

export const appointmentsRouter = Router();

function tenantId() {
  const id = getRequestContext()?.tenantId;
  if (!id) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return id;
}

appointmentsRouter.use(requireAuth, requireSubcriptionAccess);

appointmentsRouter.get(
  '/',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_READ),
  wrap(async (req, res) => {
    const query = parseDto(appointmentQuerySchema, req.query);
    const data = await appointments.listAppointments(query);
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_CREATE),
  wrap(async (req, res) => {
    const data = await appointments.createAppointment(parseDto(createAppointmentSchema, req.body), req.authUser!.userId);
    await auditFromReq(req, { action: 'APPOINTMENT_CREATE', resource: 'appointment', resourceId: data.id });
    res.status(201).json({ data });
  }),
);

appointmentsRouter.get(
  '/:id',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_READ),
  wrap(async (req, res) => {
    const data = await visit.getVisit(req.params.id, tenantId());
    await auditFromReq(req, { action: 'APPOINTMENT_VIEW', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.patch(
  '/:id',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const data = await visit.saveVisit(req.params.id, tenantId(), req.authUser!.userId, parseDto(updateVisitSchema, req.body));
    await auditFromReq(req, { action: 'APPOINTMENT_UPDATE', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/:id/check-in',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const data = await visit.setVisitStatus(req.params.id, tenantId(), req.authUser!.userId, 'check-in');
    await auditFromReq(req, { action: 'APPOINTMENT_CHECK_IN', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/:id/start',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const data = await visit.setVisitStatus(req.params.id, tenantId(), req.authUser!.userId, 'start');
    await auditFromReq(req, { action: 'APPOINTMENT_START', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/:id/complete',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const data = await visit.setVisitStatus(req.params.id, tenantId(), req.authUser!.userId, 'complete');
    await auditFromReq(req, { action: 'APPOINTMENT_COMPLETE', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/:id/reschedule',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const data = await appointments.rescheduleAppointment(
      req.params.id,
      parseDto(rescheduleAppointmentSchema, req.body),
      req.authUser!.userId,
    );
    await auditFromReq(req, { action: 'APPOINTMENT_RESCHEDULE', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);

appointmentsRouter.post(
  '/:id/cancel',
  requirePermissions(PERMISSION_CODES.APPOINTMENT_UPDATE),
  wrap(async (req, res) => {
    const body = parseDto(cancelAppointmentSchema, req.body ?? {});
    const data = await visit.setVisitStatus(req.params.id, tenantId(), req.authUser!.userId, 'cancel', body.cancelReason);
    await auditFromReq(req, { action: 'APPOINTMENT_CANCEL', resource: 'appointment', resourceId: data.id });
    res.json({ data });
  }),
);
