import { NextFunction, Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { locations } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext, setLocationContext } from '@/lib/context';
import { ERROR_CODES, ROLE_CODES } from '@/shared/types';

/**
 * Optional location middleware: reads X-Location-Id, validates it belongs to the tenant,
 * and stores it on request context. Does not invent a location when absent.
 */
export async function optionalLocation(req: Request, _res: Response, next: NextFunction) {
  try {
    const ctx = getRequestContext();
    const roles = ctx?.roles ?? req.authUser?.roles ?? [];
    if (roles.includes(ROLE_CODES.SUPER_ADMIN)) {
      setLocationContext(null);
      return next();
    }

    const raw = req.headers['x-location-id'];
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (!header?.trim()) {
      setLocationContext(null);
      return next();
    }

    const tenantId = ctx?.tenantId ?? req.authUser?.tenantId;
    if (!tenantId) {
      setLocationContext(null);
      return next();
    }

    const location = await db.query.locations.findFirst({
      where: and(
        eq(locations.id, header.trim()),
        eq(locations.tenantId, tenantId),
        eq(locations.status, 'ACTIVE'),
        isNull(locations.deletedAt),
      ),
    });
    if (!location) {
      throw new AppError(ERROR_CODES.LOCATION_NOT_FOUND, 'The selected branch was not found.', 404);
    }
    setLocationContext(location.id);
    next();
  } catch (error) {
    next(error);
  }
}
