import { Router } from 'express';
import { z } from 'zod';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth } from '@/middleware/auth';
import { createRateLimiter } from '@/lib/rate-limit-factory';
import { config } from '@/lib/config';
import { REFRESH_COOKIE } from '@/modules/auth/auth.types';
import * as mfa from './mfa.service';

export const mfaRouter = Router();

const mfaLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: config.nodeEnv === 'production' ? 5 : 30,
  message: { code: 'RATE_LIMIT', message: 'Too many MFA attempts.' },
});

const enrollStartSchema = z.object({
  enrollToken: z.string().min(1),
});

const enrollConfirmSchema = z.object({
  enrollToken: z.string().min(1),
  code: z.string().min(6).max(16),
});

const verifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(6).max(16),
});

const regenerateSchema = z.object({
  password: z.string().min(1),
});

function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function respondWithSession(
  res: import('express').Response,
  result: Awaited<ReturnType<typeof mfa.enrollConfirm>> | Awaited<ReturnType<typeof mfa.verifyMfaLogin>>,
) {
  setRefreshCookie(res, result.refreshToken);
  const { refreshToken: _ignored, ...data } = result;
  return data;
}

mfaRouter.post(
  '/enroll/start',
  mfaLimiter,
  wrap(async (req, res) => {
    const input = parseDto(enrollStartSchema, req.body);
    const data = await mfa.enrollStart(input.enrollToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data });
  }),
);

mfaRouter.post(
  '/enroll/confirm',
  mfaLimiter,
  wrap(async (req, res) => {
    const input = parseDto(enrollConfirmSchema, req.body);
    const result = await mfa.enrollConfirm(input.enrollToken, input.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data: respondWithSession(res, result) });
  }),
);

mfaRouter.post(
  '/verify',
  mfaLimiter,
  wrap(async (req, res) => {
    const input = parseDto(verifySchema, req.body);
    const result = await mfa.verifyMfaLogin(input.mfaToken, input.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data: respondWithSession(res, result) });
  }),
);

mfaRouter.post(
  '/backup-codes/regenerate',
  requireAuth,
  mfaLimiter,
  wrap(async (req, res) => {
    const input = parseDto(regenerateSchema, req.body);
    const data = await mfa.regenerateBackupCodes(req.authUser!.userId, input.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data });
  }),
);
