import { NextFunction, Request, Response } from 'express';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';
import { assertSubcriptionAccess } from '@/lib/subscription';
import { ERROR_CODES } from '@/shared/types';

export async function requireSubcriptionAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const tenantId = getRequestContext()?.tenantId ?? req.authUser?.tenantId;
    if (!tenantId) {
      throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
    }
    await assertSubcriptionAccess(tenantId);
    next();
  } catch (error) {
    next(error);
  }
}
