import { Router } from 'express';
import { createRoleSchema, paginationQuerySchema, replacePermissionsSchema, updateRoleSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { optionalLocation } from '@/middleware/location';
import { PERMISSION_CODES } from '@/shared/types';
import { auditFromReq } from '@/lib/audit';
import * as roles from './roles.service';

export const rolesRouter = Router();
export const permissionsRouter = Router();

rolesRouter.use(requireAuth, optionalLocation);

rolesRouter.get(
  '/system/doctor',
  requirePermissions(PERMISSION_CODES.ROLE_ASSIGN_PERMISSIONS),
  wrap(async (_req, res) => {
    const data = await roles.getDoctorRolePermissions();
    res.json({ data });
  }),
);

rolesRouter.put(
  '/system/doctor/permissions',
  requirePermissions(PERMISSION_CODES.ROLE_ASSIGN_PERMISSIONS),
  wrap(async (req, res) => {
    const input = parseDto(replacePermissionsSchema, req.body);
    const data = await roles.replaceDoctorRolePermissions(input.permissionCodes, req.authUser!);
    await auditFromReq(req, { action: 'DOCTOR_ROLE_PERMISSIONS_UPDATE', resource: 'role', resourceId: data.id });
    res.json({ data });
  }),
);

rolesRouter.get(
  '/',
  requirePermissions(PERMISSION_CODES.ROLE_READ),
  wrap(async (req, res) => {
    const data =
      req.query.assignable === 'true'
        ? await roles.listAssignableRoles()
        : await roles.listRoles(parseDto(paginationQuerySchema, req.query));
    res.json({ data });
  }),
);

rolesRouter.get(
  '/:id',
  requirePermissions(PERMISSION_CODES.ROLE_READ),
  wrap(async (req, res) => {
    const data = await roles.getRole(req.params.id);
    res.json({ data });
  }),
);

rolesRouter.post(
  '/',
  requirePermissions(PERMISSION_CODES.ROLE_CREATE),
  wrap(async (req, res) => {
    const data = await roles.createRole(parseDto(createRoleSchema, req.body), req.authUser!);
    res.status(201).json({ data });
  }),
);

rolesRouter.put(
  '/:id',
  requirePermissions(PERMISSION_CODES.ROLE_UPDATE),
  wrap(async (req, res) => {
    const data = await roles.updateRole(req.params.id, parseDto(updateRoleSchema, req.body), req.authUser!);
    res.json({ data });
  }),
);

rolesRouter.delete(
  '/:id',
  requirePermissions(PERMISSION_CODES.ROLE_DELETE),
  wrap(async (req, res) => {
    const data = await roles.removeRole(req.params.id, req.authUser!);
    res.json({ data });
  }),
);

rolesRouter.put(
  '/:id/permissions',
  requirePermissions(PERMISSION_CODES.ROLE_ASSIGN_PERMISSIONS),
  wrap(async (req, res) => {
    const data = await roles.replaceRolePermissions(
      req.params.id,
      parseDto(replacePermissionsSchema, req.body).permissionCodes,
      req.authUser!,
    );
    res.json({ data });
  }),
);

permissionsRouter.get(
  '/permissions',
  requireAuth,
  requirePermissions(PERMISSION_CODES.ROLE_READ),
  wrap(async (req, res) => {
    const data = await roles.listPermissionCatalog(req.query.grouped === 'true');
    res.json({ data });
  }),
);

permissionsRouter.get(
  '/modules',
  requireAuth,
  requirePermissions(PERMISSION_CODES.ROLE_READ),
  wrap(async (_req, res) => {
    const data = await roles.listModules();
    res.json({ data });
  }),
);
