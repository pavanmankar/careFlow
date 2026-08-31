import { Router } from 'express';
import { wrap } from '@/middleware/error-handler';
import { requireAuth } from '@/middleware/auth';
import { METADATA_KEYS, type MetadataKey } from '@/db/masters';
import { listActiveMetadataItems, serializeMetadataItem } from './metadata.service';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';

export const metadataRouter = Router();

const KEYS = new Set<string>(Object.values(METADATA_KEYS));

metadataRouter.get(
  '/:key',
  requireAuth,
  wrap(async (req, res) => {
    const key = req.params.key.toUpperCase();
    if (!KEYS.has(key)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Unknown metadata key.', 400);
    }
    const items = await listActiveMetadataItems(key as MetadataKey);
    res.json({ data: { items: items.map(serializeMetadataItem) } });
  }),
);
