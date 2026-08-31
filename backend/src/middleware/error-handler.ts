import { NextFunction, Request, Response } from 'express';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.errorCode, message: err.message });
  }
  if (err instanceof Error && err.message === 'TENANT_MISSING') {
    return res.status(404).json({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Workspace context is required.' });
  }
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
}

export function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
