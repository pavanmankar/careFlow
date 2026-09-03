'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, getActiveLocationId, setActiveLocationId } from '@/lib/api';
import type { MeWithLocations } from '@/lib/location';
import { cn } from '@/lib/cn';

export function BranchSwitcher() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeWithLocations>('/api/v1/auth/me'),
  });

  useEffect(() => {
    setActiveId(getActiveLocationId());
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (me.data?.roles?.includes('SUPER_ADMIN')) {
    return null;
  }

  const locations = me.data?.locations ?? [];
  const active = locations.find((loc) => loc.id === activeId) ?? locations[0] ?? null;

  function select(id: string) {
    setActiveLocationId(id);
    setActiveId(id);
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ['appointments'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    void qc.invalidateQueries({ queryKey: ['inventory'] });
    void qc.invalidateQueries({ queryKey: ['doctors'] });
    void qc.invalidateQueries({ queryKey: ['patients'] });
    void qc.invalidateQueries({ queryKey: ['users'] });
    void qc.invalidateQueries({ queryKey: ['roles'] });
  }

  if (locations.length === 0) {
    return (
      <div className="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 sm:flex">
        <MapPin className="h-3.5 w-3.5" />
        No location
      </div>
    );
  }

  if (locations.length === 1) {
    return (
      <div className="hidden max-w-[12rem] items-center gap-1.5 truncate rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-900 sm:flex">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="truncate">{active?.name}</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-slate-50"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="truncate">{active?.name ?? 'Select branch'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[14rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => select(loc.id)}
              className={cn(
                'flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50',
                loc.id === activeId && 'bg-mint/50',
              )}
            >
              <span className="font-medium text-navy-900">{loc.name}</span>
              <span className="text-xs text-slate-500">{loc.code}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
