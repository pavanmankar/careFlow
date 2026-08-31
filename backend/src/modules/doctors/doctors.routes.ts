import { Router } from 'express';
import { createDoctorSchema, doctorSlotsQuerySchema, paginationQuerySchema, updateDoctorSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { requireSubcriptionAccess } from '@/middleware/subscription';
import { optionalLocation } from '@/middleware/location';
import { PERMISSION_CODES } from '@/shared/types';
import * as doctors from './doctors.service';
import { auditFromReq } from '@/lib/audit';

export const doctorsRouter = Router();

doctorsRouter.use(requireAuth, optionalLocation);

doctorsRouter.get(
  '/',
  requirePermissions(PERMISSION_CODES.DOCTOR_READ),
  wrap(async (req, res) => {
    const data =
      req.query.managed === 'true'
        ? await doctors.listManagedDoctors(parseDto(paginationQuerySchema, req.query))
        : await doctors.listDoctors();
    res.json({ data });
  }),
);

doctorsRouter.post(
  '/',
  requirePermissions(PERMISSION_CODES.DOCTOR_CREATE),
  wrap(async (req, res) => {
    const data = await doctors.createDoctor(parseDto(createDoctorSchema, req.body), req.authUser!);
    await auditFromReq(req, { action: 'DOCTOR_CREATE', resource: 'doctor', resourceId: data.id });
    res.status(201).json({ data });
  }),
);

doctorsRouter.get(
  '/:userId/slots',
  requireSubcriptionAccess,
  requirePermissions(PERMISSION_CODES.APPOINTMENT_READ),
  wrap(async (req, res) => {
    const query = parseDto(doctorSlotsQuerySchema, req.query);
    const data = await doctors.listDoctorSlots(req.params.userId, query.date, query.excludeAppointmentId);
    res.json({ data });
  }),
);

doctorsRouter.post(
  '/:userId/activate',
  requirePermissions(PERMISSION_CODES.DOCTOR_ACTIVATE),
  wrap(async (req, res) => {
    const data = await doctors.setDoctorActive(req.params.userId, true, req.authUser!);
    await auditFromReq(req, { action: 'DOCTOR_ACTIVATE', resource: 'doctor', resourceId: data.id });
    res.json({ data });
  }),
);

doctorsRouter.post(
  '/:userId/deactivate',
  requirePermissions(PERMISSION_CODES.DOCTOR_ACTIVATE),
  wrap(async (req, res) => {
    const data = await doctors.setDoctorActive(req.params.userId, false, req.authUser!);
    await auditFromReq(req, { action: 'DOCTOR_DEACTIVATE', resource: 'doctor', resourceId: data.id });
    res.json({ data });
  }),
);

doctorsRouter.get(
  '/:userId',
  requirePermissions(PERMISSION_CODES.DOCTOR_READ),
  wrap(async (req, res) => {
    const data = await doctors.getDoctor(req.params.userId);
    res.json({ data });
  }),
);

doctorsRouter.put(
  '/:userId',
  requirePermissions(PERMISSION_CODES.DOCTOR_UPDATE),
  wrap(async (req, res) => {
    const input = parseDto(updateDoctorSchema, req.body);
    const data = await doctors.updateDoctor(req.params.userId, input, req.authUser!);
    await auditFromReq(req, { action: 'DOCTOR_UPDATE', resource: 'doctor', resourceId: data.id });
    res.json({ data });
  }),
);
