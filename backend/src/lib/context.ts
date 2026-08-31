import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AuthUser } from '@/modules/auth/auth.types';

export interface RequestContext {
  traceId: string;
  tenantId: string | null;
  userId: string | null;
  roles: string[];
  permissions: string[];
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireTenantId(): string {
  const tenantId = storage.getStore()?.tenantId;
  if (!tenantId) {
    throw new Error('TENANT_MISSING');
  }
  return tenantId;
}

export function contextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerTrace = req.headers['x-trace-id'];
  const traceId = (Array.isArray(headerTrace) ? headerTrace[0] : headerTrace) || randomUUID();
  storage.run(
    { traceId, tenantId: null, userId: null, roles: [], permissions: [] },
    () => next(),
  );
}

export function setAuthContext(user: AuthUser) {
  const current = storage.getStore();
  if (!current) {
    return;
  }
  current.tenantId = user.tenantId;
  current.userId = user.userId;
  current.roles = user.roles;
  current.permissions = user.permissions;
}
