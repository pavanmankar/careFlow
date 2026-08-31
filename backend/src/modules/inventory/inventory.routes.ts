import { Router } from 'express';
import { createInventoryItemSchema, paginationQuerySchema, updateInventoryItemSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requirePermissions } from '@/middleware/auth';
import { optionalLocation } from '@/middleware/location';
import { PERMISSION_CODES } from '@/shared/types';
import * as inventory from './inventory.service';
import { auditFromReq } from '@/lib/audit';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, optionalLocation);

inventoryRouter.get(
  '/',
  requirePermissions(PERMISSION_CODES.INVENTORY_READ),
  wrap(async (req, res) => {
    const query = parseDto(paginationQuerySchema, req.query);
    res.json({ data: await inventory.listInventory(query) });
  }),
);

inventoryRouter.post(
  '/reset',
  requirePermissions(PERMISSION_CODES.INVENTORY_UPDATE),
  wrap(async (req, res) => {
    const data = await inventory.resetInventory(req.authUser!.userId);
    await auditFromReq(req, { action: 'INVENTORY_RESET', resource: 'inventory' });
    res.json({ data });
  }),
);

inventoryRouter.post(
  '/',
  requirePermissions(PERMISSION_CODES.INVENTORY_CREATE),
  wrap(async (req, res) => {
    const data = await inventory.createInventoryItem(parseDto(createInventoryItemSchema, req.body), req.authUser!.userId);
    await auditFromReq(req, { action: 'INVENTORY_CREATE', resource: 'inventory', resourceId: data.id });
    res.status(201).json({ data });
  }),
);

inventoryRouter.patch(
  '/:id',
  requirePermissions(PERMISSION_CODES.INVENTORY_UPDATE),
  wrap(async (req, res) => {
    const data = await inventory.updateInventoryItem(
      req.params.id,
      parseDto(updateInventoryItemSchema, req.body),
      req.authUser!.userId,
    );
    await auditFromReq(req, { action: 'INVENTORY_UPDATE', resource: 'inventory', resourceId: data.id });
    res.json({ data });
  }),
);
