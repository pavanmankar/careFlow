import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';
import { setAuthContext } from '@/lib/context';
import { hasPermissions } from '@/lib/permissions';
import { loadAuthUser } from '@/modules/auth/auth.service';
import { AuthUser } from '@/modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  return requireAuth(req, _res, next);
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401);
    }
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await loadAuthUser(payload.sub);
    req.authUser = user;
    setAuthContext(user);
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401),
    );
  }
}

export function requirePermissions(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401));
    }
    if (user.roles.includes('SUPER_ADMIN') || hasPermissions(user.permissions, codes)) {
      return next();
    }
    next(new AppError(ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action.', 403));
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.authUser) {
    return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required.', 401));
  }
  if (!req.authUser.roles.includes('SUPER_ADMIN')) {
    return next(new AppError(ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action.', 403));
  }
  next();
}
