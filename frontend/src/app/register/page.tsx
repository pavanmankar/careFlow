'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@/lib/validation';
import { api, ApiClientError, setAccessToken, setApiBusy } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ClinicLogo } from '@/components/clinic-logo';
import { AuthBrandPanel } from '@/components/auth-brand-panel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const fieldClass =
  'h-12 rounded-xl border-0 bg-[#F3F4F6] px-4 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

const formSchema = registerSchema
  .omit({ firstName: true, lastName: true })
  .extend({
    fullName: z.string().trim().min(1, 'Full name is required').max(255),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    terms: z.boolean().refine((value) => value === true, 'Please accept the terms'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

interface BusinessType {
  id: string;
  name: string;
  code: string;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const types = useQuery({
    queryKey: ['business-types'],
    queryFn: () => api.get<{ items: BusinessType[] }>('/api/v1/business-types'),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessTypeId: '',
      businessName: '',
      terms: false,
    },
  });

  useEffect(() => {
    setApiBusy(false);
  }, []);

  async function onSubmit(values: FormValues) {
    setError(null);
    setBusy(true);
    setApiBusy(true, 'Creating account');
    try {
      const { firstName, lastName } = splitName(values.fullName);
      const data = await api.post<{ accessToken: string }>('/api/v1/auth/register', {
        firstName,
        lastName,
        email: values.email,
        password: values.password,
        businessTypeId: values.businessTypeId,
        businessName: values.businessName,
      });
      setAccessToken(data.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setBusy(false);
      setApiBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Unable to create account');
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel variant="register" />
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <ClinicLogo />
          </div>
          <h1 className="text-center text-[26px] font-bold leading-tight text-navy-900">Create Your CareFlow Account</h1>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500">
            Register your clinic to start managing patients, appointments, and operations.
          </p>
          <form className="mt-8 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Full name</label>
              <Input className={fieldClass} placeholder="Jordan Blake" {...form.register('fullName')} />
              {form.formState.errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Email</label>
              <Input type="text" autoComplete="email" className={fieldClass} {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
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
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Confirm password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  className={`${fieldClass} pr-11`}
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowConfirm((open) => !open)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Type of clinic</label>
              <Select className={fieldClass} {...form.register('businessTypeId')}>
                <option value="">Select type of clinic</option>
                {types.data?.items.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Name of clinic</label>
              <Input className={fieldClass} placeholder="Sunrise Family Clinic" {...form.register('businessName')} />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                {...form.register('terms')}
              />
              <span>
                I agree to the CareFlow terms of service and privacy policy.
              </span>
            </label>
            {form.formState.errors.terms && (
              <p className="text-sm text-red-600">{form.formState.errors.terms.message}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-brand-600"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/login">
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
