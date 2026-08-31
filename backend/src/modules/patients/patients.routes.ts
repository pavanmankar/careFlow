import { Router } from 'express';
import { paginationQuerySchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { PERMISSION_CODES } from '@/shared/types';
import * as patients from './patients.service';
import { auditFromReq } from '@/lib/audit';

export const patientsRouter = Router();

patientsRouter.get(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.PATIENT_READ),
  wrap(async (req, res) => {
    const query = parseDto(paginationQuerySchema, req.query);
    const data = await patients.listPatients(query);
    res.json({ data });
  }),
);

patientsRouter.get(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.PATIENT_READ),
  wrap(async (req, res) => {
    const data = await patients.getPatient(req.params.id);
    await auditFromReq(req, { action: 'PATIENT_VIEW', resource: 'patient', resourceId: data.id });
    res.json({ data });
  }),
);
