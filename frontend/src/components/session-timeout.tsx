'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAccessToken, setAccessToken, setApiBusy } from '@/lib/api';

const IDLE_MS = 15 * 60 * 1000;

export function SessionTimeout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function signOut() {
      if (!getAccessToken()) {
        return;
      }
      setApiBusy(true, 'Signing out');
      try {
        await api.post('/api/v1/auth/logout');
      } catch {
        // Still clear the local session if the API call fails.
      }
      setAccessToken(null);
      router.replace('/login');
    }

    function reset() {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        void signOut();
      }, IDLE_MS);
    }

    reset();
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, reset));
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [router]);

  return null;
}
