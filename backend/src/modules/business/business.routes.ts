import { Router } from 'express';
import { z } from 'zod';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions, requireSuperAdmin } from '@/middleware/auth';
import { AppError } from '@/lib/errors';
import { ERROR_CODES, PERMISSION_CODES } from '@/shared/types';
import { updateBusinessSchema } from '@/shared/validation';
import * as businesses from '@/modules/businesses/businesses.service';
import {
  paginationQuerySchema,
  createLocationSchema,
  updateLocationSchema,
  registerSchema,
} from '@/shared/validation';
import * as locations from '@/modules/locations/locations.service';
import * as tenants from '@/modules/tenants/tenants.service';
import { auditFromReq } from '@/lib/audit';

export const tenantsRouter = Router();
export const businessRouter = Router();
export const locationsRouter = Router();

const updateTenantSchema = z.object({ name: z.string().min(1).max(255).optional() });
const updateTenantSubscriptionSchema = z.object({
  subcriptionEnabled: z.boolean().optional(),
  subcriptionUntil: z.number().int().nullable().optional(),
});

tenantsRouter.get(
  '/current',
  requireAuth,
  wrap(async (req, res) => {
    const tenantId = req.authUser?.tenantId;
    if (!tenantId) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'No workspace is associated with this account.', 404);
    }
    const data = await tenants.getCurrentTenant(tenantId);
    res.json({ data });
  }),
);

tenantsRouter.put(
  '/current',
  requireAuth,
  requirePermissions(PERMISSION_CODES.BUSINESS_UPDATE),
  wrap(async (req, res) => {
    const tenantId = req.authUser?.tenantId;
    if (!tenantId) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'No workspace is associated with this account.', 404);
    }
    const input = parseDto(updateTenantSchema, req.body);
    const data = await tenants.updateCurrentTenant(tenantId, input, req.authUser!.userId);
    res.json({ data });
  }),
);

tenantsRouter.get(
  '/',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const query = parseDto(paginationQuerySchema, req.query);
    const data = await tenants.listTenants(query);
    res.json({ data });
  }),
);

tenantsRouter.post(
  '/',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const input = parseDto(registerSchema, req.body);
    const data = await tenants.createTenant(input, req.authUser!.userId);
    await auditFromReq(req, { action: 'TENANT_CREATE', resource: 'tenant', resourceId: data.id, tenantId: data.id });
    res.status(201).json({ data });
  }),
);

tenantsRouter.get(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const data = await tenants.getTenant(req.params.id);
    await auditFromReq(req, { action: 'TENANT_VIEW', resource: 'tenant', resourceId: data.id, tenantId: data.id });
    res.json({ data });
  }),
);

tenantsRouter.patch(
  '/:id/subscription',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const input = parseDto(updateTenantSubscriptionSchema, req.body);
    const data = await tenants.patchTenantSubscription(req.params.id, input, req.authUser!.userId);
    await auditFromReq(req, {
      action: 'TENANT_SUBSCRIPTION_UPDATE',
      resource: 'tenant',
      resourceId: data.id,
      tenantId: data.id,
    });
    res.json({ data });
  }),
);

tenantsRouter.post(
  '/:id/activate',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const data = await tenants.setTenantActive(req.params.id, true, req.authUser!.userId);
    await auditFromReq(req, { action: 'TENANT_ACTIVATE', resource: 'tenant', resourceId: data.id, tenantId: data.id });
    res.json({ data });
  }),
);

tenantsRouter.post(
  '/:id/deactivate',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const data = await tenants.setTenantActive(req.params.id, false, req.authUser!.userId);
    await auditFromReq(req, { action: 'TENANT_DEACTIVATE', resource: 'tenant', resourceId: data.id, tenantId: data.id });
    res.json({ data });
  }),
);

businessRouter.get(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.BUSINESS_READ),
  wrap(async (_req, res) => {
    const data = await businesses.getCurrentBusiness();
    res.json({ data });
  }),
);

businessRouter.put(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.BUSINESS_UPDATE),
  wrap(async (req, res) => {
    const data = await businesses.updateCurrentBusiness(
      parseDto(updateBusinessSchema, req.body),
      req.authUser!.userId,
    );
    res.json({ data });
  }),
);

locationsRouter.get(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.LOCATION_READ),
  wrap(async (req, res) => {
    const query = parseDto(paginationQuerySchema, req.query);
    const data = await locations.listLocations(query);
    res.json({ data });
  }),
);

locationsRouter.get(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.LOCATION_READ),
  wrap(async (req, res) => {
    const data = await locations.getLocation(req.params.id);
    res.json({ data });
  }),
);

locationsRouter.post(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.LOCATION_CREATE),
  wrap(async (req, res) => {
    const data = await locations.createLocation(parseDto(createLocationSchema, req.body), req.authUser!.userId);
    res.status(201).json({ data });
  }),
);

locationsRouter.put(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.LOCATION_UPDATE),
  wrap(async (req, res) => {
    const data = await locations.updateLocation(
      req.params.id,
      parseDto(updateLocationSchema, req.body),
      req.authUser!.userId,
    );
    res.json({ data });
  }),
);

locationsRouter.delete(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.LOCATION_DELETE),
  wrap(async (req, res) => {
    const data = await locations.removeLocation(req.params.id, req.authUser!.userId);
    res.json({ data });
  }),
);
