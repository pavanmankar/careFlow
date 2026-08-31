import { Router } from 'express';
import {
  assignRolesSchema,
  createUserSchema,
  paginationQuerySchema,
  updateUserSchema,
} from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { PERMISSION_CODES } from '@/shared/types';
import * as users from './users.service';
import { auditFromReq } from '@/lib/audit';

export const usersRouter = Router();

usersRouter.get(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_READ),
  wrap(async (req, res) => {
    const query = parseDto(paginationQuerySchema, req.query);
    const data = await users.listUsers(query);
    res.json({ data });
  }),
);

usersRouter.get(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_READ),
  wrap(async (req, res) => {
    const data = await users.getUser(req.params.id);
    res.json({ data });
  }),
);

usersRouter.post(
  '/',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_CREATE),
  wrap(async (req, res) => {
    const data = await users.createUser(parseDto(createUserSchema, req.body), req.authUser!);
    await auditFromReq(req, { action: 'STAFF_CREATE', resource: 'user', resourceId: data.id });
    res.status(201).json({ data });
  }),
);

usersRouter.put(
  '/:id',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_UPDATE),
  wrap(async (req, res) => {
    const data = await users.updateUser(req.params.id, parseDto(updateUserSchema, req.body), req.authUser!);
    res.json({ data });
  }),
);

usersRouter.post(
  '/:id/activate',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_ACTIVATE),
  wrap(async (req, res) => {
    const data = await users.setUserActive(req.params.id, true, req.authUser!);
    await auditFromReq(req, { action: 'STAFF_ACTIVATE', resource: 'user', resourceId: data.id });
    res.json({ data });
  }),
);

usersRouter.post(
  '/:id/deactivate',
  requireAuth,
  requirePermissions(PERMISSION_CODES.STAFF_ACTIVATE),
  wrap(async (req, res) => {
    const data = await users.setUserActive(req.params.id, false, req.authUser!);
    await auditFromReq(req, { action: 'STAFF_DEACTIVATE', resource: 'user', resourceId: data.id });
    res.json({ data });
  }),
);

usersRouter.put(
  '/:id/roles',
  requireAuth,
  requirePermissions(PERMISSION_CODES.USER_ASSIGN_ROLE),
  wrap(async (req, res) => {
    const data = await users.assignUserRoles(
      req.params.id,
      parseDto(assignRolesSchema, req.body).roleIds,
      req.authUser!,
    );
    res.json({ data });
  }),
);
