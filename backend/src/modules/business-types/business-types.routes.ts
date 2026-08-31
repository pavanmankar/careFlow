import { Router } from 'express';
import { createBusinessTypeSchema, updateBusinessTypeSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth } from '@/middleware/auth';
import { AppError } from '@/lib/errors';
import { ROLE_CODES } from '@/shared/types';
import * as service from './business-types.service';

export const businessTypesRouter = Router();

businessTypesRouter.get(
  '/',
  wrap(async (_req, res) => {
    const data = await service.listActiveBusinessTypes();
    res.json({ data });
  }),
);

businessTypesRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    if (!req.authUser?.roles.includes(ROLE_CODES.SUPER_ADMIN)) {
      throw new AppError('FORBIDDEN', 'Platform administrator access is required.', 403);
    }
    const data = await service.createBusinessType(parseDto(createBusinessTypeSchema, req.body));
    res.status(201).json({ data });
  }),
);

businessTypesRouter.put(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    if (!req.authUser?.roles.includes(ROLE_CODES.SUPER_ADMIN)) {
      throw new AppError('FORBIDDEN', 'Platform administrator access is required.', 403);
    }
    const data = await service.updateBusinessType(req.params.id, parseDto(updateBusinessTypeSchema, req.body));
    res.json({ data });
  }),
);
