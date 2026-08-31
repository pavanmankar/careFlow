import { Router } from 'express';
import { loginSchema, registerSchema, updateMeSchema, updateMeRolesSchema } from '@/shared/validation';
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

authRouter.post(
  '/register',
  wrap(async (req, res) => {
    const input = parseDto(registerSchema, req.body);
    const result = await auth.register(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _ignored, ...data } = result;
    res.status(201).json({ data });
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
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _ignored, ...data } = result;
    res.json({ data });
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
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _ignored, ...data } = result;
    res.json({ data });
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
