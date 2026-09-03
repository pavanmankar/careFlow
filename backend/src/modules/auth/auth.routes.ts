import { Router } from 'express';
import { loginSchema, registerSchema, acceptLegalSchema, updateMeSchema, updateMeRolesSchema } from '@/shared/validation';
import { parseDto } from '@/lib/http';
import { wrap } from '@/middleware/error-handler';
import { requireAuth } from '@/middleware/auth';
import * as auth from './auth.service';
import { REFRESH_COOKIE } from './auth.types';
import { Response } from 'express';

export const authRouter = Router();

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function respondAuthResult(res: Response, result: auth.LoginResult, status = 200) {
  if ('refreshToken' in result && result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _ignored, ...data } = result;
    res.status(status).json({ data });
    return;
  }
  res.status(status).json({ data: result });
}

authRouter.post(
  '/register',
  wrap(async (req, res) => {
    const input = parseDto(registerSchema, req.body);
    const result = await auth.register(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    respondAuthResult(res, result, 201);
  }),
);

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const input = parseDto(loginSchema, req.body);
    const result = await auth.login(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    respondAuthResult(res, result);
  }),
);

authRouter.post(
  '/refresh',
  wrap(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await auth.refresh(token ?? '', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    respondAuthResult(res, result);
  }),
);

authRouter.post(
  '/logout',
  wrap(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await auth.logout(token, { ip: req.ip, userAgent: req.headers['user-agent'] });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    res.json({ data: { loggedOut: true } });
  }),
);

authRouter.post(
  '/legal/accept',
  requireAuth,
  wrap(async (req, res) => {
    const input = parseDto(acceptLegalSchema, req.body);
    const data = await auth.acceptLegal(req.authUser!.userId, req.authUser!.tenantId, input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ data });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const data = await auth.me(req.authUser!.userId, req.authUser);
    res.json({ data });
  }),
);

authRouter.get(
  '/me/assignable-roles',
  requireAuth,
  wrap(async (req, res) => {
    const data = await auth.listMyAssignableRoles(req.authUser!.userId);
    res.json({ data });
  }),
);

authRouter.put(
  '/me/roles',
  requireAuth,
  wrap(async (req, res) => {
    const data = await auth.updateMyRoles(
      req.authUser!.userId,
      parseDto(updateMeRolesSchema, req.body ?? {}),
    );
    res.json({ data });
  }),
);

authRouter.put(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const data = await auth.updateMe(req.authUser!.userId, parseDto(updateMeSchema, req.body));
    res.json({ data });
  }),
);
