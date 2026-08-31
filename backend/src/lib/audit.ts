import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { clipIp, clipUserAgent } from '@/lib/request-meta';
import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { Request } from 'express';

/**
 * Access audit trail. Do not pass passwords, clinical notes, or other PHI.
 * HIPAA still also needs TLS in production, access policies, and a BAA with hosting.
 */
export async function writeAudit(entry: {
  action: string;
  resource: string;
  resourceId?: string | null;
  tenantId?: string | null;
  actorId?: string | null;
  ip?: string;
  userAgent?: string;
}) {
  await db.insert(auditLogs).values({
    id: ULID.random(),
    tenantId: entry.tenantId ?? null,
    actorId: entry.actorId ?? null,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId ?? null,
    ip: clipIp(entry.ip),
    userAgent: clipUserAgent(entry.userAgent),
    createdAt: BigInt(utcNowMs()),
  });
}

export function auditFromReq(
  req: Request,
  entry: { action: string; resource: string; resourceId?: string | null; tenantId?: string | null },
) {
  return writeAudit({
    ...entry,
    tenantId: entry.tenantId ?? req.authUser?.tenantId,
    actorId: req.authUser?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });
}
