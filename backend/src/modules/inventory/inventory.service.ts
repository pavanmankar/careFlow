import { and, asc, count, desc, eq, isNull, or } from 'drizzle-orm';
import { ULID } from '@/lib/id';
import { ERROR_CODES } from '@/shared/types';
import { CreateInventoryItemInput, UpdateInventoryItemInput } from '@/shared/validation';
import { createStamps, db, likeContains, omitUndefined, updateStamp } from '@/db/client';
import { inventoryItems } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getRequestContext } from '@/lib/context';

export type InventoryStatus = 'Available' | 'Low stock' | 'Critical';

function requireTenant() {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) {
    throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, 'Workspace context is required.', 404);
  }
  return tenantId;
}

export function inventoryStatus(quantity: number, maxQuantity: number): InventoryStatus {
  if (maxQuantity <= 0) {
    return quantity > 0 ? 'Available' : 'Critical';
  }
  const percent = quantity / maxQuantity;
  if (quantity === 0 || percent <= 0.15) {
    return 'Critical';
  }
  if (percent <= 0.4) {
    return 'Low stock';
  }
  return 'Available';
}

function percentOf(quantity: number, maxQuantity: number) {
  if (maxQuantity <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((quantity / maxQuantity) * 100));
}

function serialize(row: typeof inventoryItems.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    maxQuantity: row.maxQuantity,
    status: inventoryStatus(row.quantity, row.maxQuantity),
    percent: percentOf(row.quantity, row.maxQuantity),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function countsFromRows(rows: Array<{ quantity: number; maxQuantity: number }>) {
  const counts = { items: rows.length, available: 0, lowStock: 0, critical: 0 };
  for (const row of rows) {
    const status = inventoryStatus(row.quantity, row.maxQuantity);
    if (status === 'Available') {
      counts.available += 1;
    } else if (status === 'Low stock') {
      counts.lowStock += 1;
    } else {
      counts.critical += 1;
    }
  }
  return counts;
}

async function nextSku(tenantId: string) {
  const rows = await db
    .select({ sku: inventoryItems.sku })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt)));
  let next = 1024;
  for (const row of rows) {
    const match = /^INV-(\d+)$/i.exec(row.sku);
    if (match) {
      next = Math.max(next, Number(match[1]) + 1);
    }
  }
  return `INV-${String(next).padStart(4, '0')}`;
}

async function requireItem(id: string) {
  const tenantId = requireTenant();
  const row = await db.query.inventoryItems.findFirst({
    where: and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt)),
  });
  if (!row) {
    throw new AppError(ERROR_CODES.INVENTORY_NOT_FOUND, 'The requested resource was not found.', 404);
  }
  return row;
}

async function assertSkuFree(tenantId: string, sku: string, exceptId?: string) {
  const existing = await db.query.inventoryItems.findFirst({
    where: and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.sku, sku), isNull(inventoryItems.deletedAt)),
  });
  if (existing && existing.id !== exceptId) {
    throw new AppError(ERROR_CODES.CONFLICT, 'An item with this SKU already exists.', 409);
  }
}

export async function listInventory(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const tenantId = requireTenant();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortDirection = query.sortDirection ?? 'asc';
  const filters = [
    eq(inventoryItems.tenantId, tenantId),
    isNull(inventoryItems.deletedAt),
    ...(query.search
      ? [
          or(
            likeContains(inventoryItems.name, query.search),
            likeContains(inventoryItems.sku, query.search),
            likeContains(inventoryItems.category, query.search),
          )!,
        ]
      : []),
  ];
  const where = and(...filters);
  const [rows, totals, stockRows] = await Promise.all([
    db
      .select()
      .from(inventoryItems)
      .where(where)
      .orderBy(sortDirection === 'desc' ? desc(inventoryItems.name) : asc(inventoryItems.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(inventoryItems).where(where),
    db
      .select({ quantity: inventoryItems.quantity, maxQuantity: inventoryItems.maxQuantity })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt))),
  ]);
  return {
    items: rows.map(serialize),
    page,
    pageSize,
    total: Number(totals[0]?.total ?? 0),
    counts: countsFromRows(stockRows),
  };
}

export async function createInventoryItem(input: CreateInventoryItemInput, actorId: string) {
  const tenantId = requireTenant();
  const sku = input.sku?.trim() ? input.sku.trim().toUpperCase() : await nextSku(tenantId);
  if (input.quantity > input.maxQuantity) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Quantity cannot be greater than max quantity.', 400);
  }
  await assertSkuFree(tenantId, sku);
  const id = ULID.random();
  await db.insert(inventoryItems).values({
    id,
    tenantId,
    name: input.name.trim(),
    sku,
    category: input.category,
    unit: input.unit,
    quantity: input.quantity,
    maxQuantity: input.maxQuantity,
    createdBy: actorId,
    updatedBy: actorId,
    ...createStamps(),
  });
  return serialize(await requireItem(id));
}

export async function updateInventoryItem(id: string, input: UpdateInventoryItemInput, actorId: string) {
  const row = await requireItem(id);
  const nextQty = input.quantity ?? row.quantity;
  const nextMax = input.maxQuantity ?? row.maxQuantity;
  if (nextQty > nextMax) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Quantity cannot be greater than max quantity.', 400);
  }
  if (input.sku?.trim()) {
    await assertSkuFree(row.tenantId, input.sku.trim().toUpperCase(), row.id);
  }
  await db
    .update(inventoryItems)
    .set(
      omitUndefined({
        name: input.name?.trim(),
        sku: input.sku?.trim() ? input.sku.trim().toUpperCase() : undefined,
        category: input.category,
        unit: input.unit,
        quantity: input.quantity,
        maxQuantity: input.maxQuantity,
        updatedBy: actorId,
        ...updateStamp(),
      }),
    )
    .where(eq(inventoryItems.id, id));
  return serialize(await requireItem(id));
}

export async function resetInventory(actorId: string) {
  const tenantId = requireTenant();
  await db
    .update(inventoryItems)
    .set({ quantity: 0, updatedBy: actorId, ...updateStamp() })
    .where(and(eq(inventoryItems.tenantId, tenantId), isNull(inventoryItems.deletedAt)));
  return listInventory({ page: 1, pageSize: 10 });
}
