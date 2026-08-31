'use client';

import { subscribeApiProgress } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ApiProgress() {
  const [state, setState] = useState({ active: false, blocking: false, message: 'Loading' });

  useEffect(() => subscribeApiProgress(setState), []);

  if (!state.active) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 overflow-hidden bg-brand-100">
        <div className="h-full w-1/3 animate-api-progress rounded-full bg-brand-500" />
      </div>
      {state.blocking ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-900/25">
          <div className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-navy-900 shadow-[0_8px_24px_rgba(15,39,68,0.16)]">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            {state.message}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed right-6 top-4 z-[80]">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy-900 shadow-[0_8px_24px_rgba(15,39,68,0.12)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
            Loading
          </div>
        </div>
      )}
    </>
  );
}
