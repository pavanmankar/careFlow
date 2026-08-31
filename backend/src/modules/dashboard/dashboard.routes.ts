import { Router } from 'express';
import { dashboardQuerySchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { PERMISSION_CODES } from '@/shared/types';
import * as dashboard from './dashboard.service';

export const dashboardRouter = Router();

const readCharts = [requireAuth, requirePermissions(PERMISSION_CODES.PATIENT_READ, PERMISSION_CODES.APPOINTMENT_READ)];

dashboardRouter.get(
  '/counts',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getCounts(query) });
  }),
);

dashboardRouter.get(
  '/patients-by-age',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getPatientsByAge(query) });
  }),
);

dashboardRouter.get(
  '/appointments-by-type',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getAppointmentsByType(query) });
  }),
);

dashboardRouter.get(
  '/appointments-by-status',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getAppointmentsByStatus(query) });
  }),
);

dashboardRouter.get(
  '/patients-over-time',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getPatientsOverTime(query) });
  }),
);

dashboardRouter.get(
  '/appointments-over-time',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getAppointmentsOverTime(query) });
  }),
);

dashboardRouter.get(
  '/revenue-over-time',
  ...readCharts,
  wrap(async (req, res) => {
    const query = parseDto(dashboardQuerySchema, req.query);
    res.json({ data: await dashboard.getRevenueOverTime(query) });
  }),
);
