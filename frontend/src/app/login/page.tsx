'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validation';
import { api, ApiClientError, setAccessToken, setApiBusy } from '@/lib/api';
import { resolveBranchAfterAuth, type MeWithLocations } from '@/lib/location';
import {
  isFullSessionResponse,
  isMfaEnrollmentResponse,
  isMfaVerifyResponse,
  type MfaLoginResponse,
} from '@/lib/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClinicLogo } from '@/components/clinic-logo';
import { AuthBrandPanel } from '@/components/auth-brand-panel';
import Link from 'next/link';
import { LegalFooterLinks } from '@/components/legal/legal-footer-links';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const fieldClass =
  'h-12 rounded-xl border-0 bg-[#F3F4F6] px-4 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    setApiBusy(false);
  }, []);

  async function finishLogin(accessToken: string) {
    setAccessToken(accessToken);
    const me = await api.get<MeWithLocations>('/api/v1/auth/me');
    setApiBusy(false);
    router.push(resolveBranchAfterAuth(me));
  }

  async function onSubmit(values: LoginInput) {
    setError(null);
    setMfaToken(null);
    setMfaCode('');
    setBusy(true);
    setApiBusy(true, 'Signing in');
    try {
      const data = await api.post<MfaLoginResponse>('/api/v1/auth/login', values);
      if (isMfaEnrollmentResponse(data)) {
        setApiBusy(false);
        setBusy(false);
        router.push(`/mfa/enroll?token=${encodeURIComponent(data.enrollToken)}`);
        return;
      }
      if (isMfaVerifyResponse(data)) {
        setMfaToken(data.mfaToken);
        setBusy(false);
        setApiBusy(false);
        return;
      }
      if (isFullSessionResponse(data)) {
        await finishLogin(data.accessToken);
        return;
      }
      throw new Error('Unexpected login response');
    } catch (err) {
      setBusy(false);
      setApiBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in');
    }
  }

  async function onVerifyMfa(event: React.FormEvent) {
    event.preventDefault();
    if (!mfaToken) {
      return;
    }
    setError(null);
    setBusy(true);
    setApiBusy(true, 'Verifying code');
    try {
      const data = await api.post<{ accessToken: string }>('/api/v1/auth/mfa/verify', {
        mfaToken,
        code: mfaCode,
      });
      await finishLogin(data.accessToken);
    } catch (err) {
      setBusy(false);
      setApiBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Invalid authentication code');
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel variant="login" />
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <ClinicLogo />
          </div>
          <h1 className="text-center text-[26px] font-bold leading-tight text-navy-900">
            {mfaToken ? 'Two-factor authentication' : 'Welcome Back to CareFlow'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500">
            {mfaToken
              ? 'Enter the 6-digit code from your authenticator app or a backup code.'
              : 'Sign in to continue managing patients, appointments, and clinic operations in real time.'}
          </p>
          {mfaToken ? (
            <form className="mt-10 space-y-5" onSubmit={onVerifyMfa}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Authentication code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={fieldClass}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <p className="text-sm text-slate-500">
                Lost your authenticator? Contact your clinic owner or administrator.
              </p>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-brand-600"
                disabled={busy || mfaCode.trim().length < 6}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
              <button
                type="button"
                className="w-full text-sm font-medium text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setMfaToken(null);
                  setMfaCode('');
                  setError(null);
                }}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form className="mt-10 space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Email or Username</label>
                <Input
                  type="text"
                  autoComplete="email"
                  placeholder="Input your email or username"
                  className={fieldClass}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Input your password"
                    className={`${fieldClass} pr-11`}
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((open) => !open)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Remember Me
                </label>
                <span className="cursor-pointer font-medium text-brand-600">Forgot Password?</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-brand-600"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          )}
          {!mfaToken && (
            <>
              <p className="mt-8 text-center text-sm text-slate-500">
                New to CareFlow?{' '}
                <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/register">
                  Create an account
                </Link>
              </p>
              <p className="mt-4 text-center text-sm text-slate-500">
                Want to explore first?{' '}
                <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/demo">
                  Try read-only demo
                </Link>
              </p>
              <LegalFooterLinks />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
