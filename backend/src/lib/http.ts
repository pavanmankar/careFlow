import { ZodSchema } from 'zod';
import { AppError } from './errors';
import { ERROR_CODES } from '@/shared/types';

export function parseDto<T>(schema: ZodSchema<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      result.error.issues.map((issue) => issue.message).join('; '),
      400,
    );
  }
  return result.data;
}
