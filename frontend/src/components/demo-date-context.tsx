'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ymdInTimeZone } from '@/lib/clinic';
import { demoDateRange, PUBLIC_DEMO } from '@/lib/demo';

interface DemoDateContextValue {
  isDemo: boolean;
  anchorDate: string | null;
}

const DemoDateContext = createContext<DemoDateContextValue>({
  isDemo: false,
  anchorDate: null,
});

export function DemoDateProvider({ isDemo, children }: { isDemo: boolean; children: ReactNode }) {
  const value = useMemo(
    () => ({
      isDemo,
      anchorDate: isDemo ? PUBLIC_DEMO.anchorDate : null,
    }),
    [isDemo],
  );

  return <DemoDateContext.Provider value={value}>{children}</DemoDateContext.Provider>;
}

export function useDemoDates(timezone = 'Asia/Kolkata') {
  const { isDemo, anchorDate } = useContext(DemoDateContext);
  const chartRange = isDemo ? demoDateRange() : null;
  const dayYmd = anchorDate ?? ymdInTimeZone(Date.now(), timezone);

  return {
    isDemo,
    anchorDate,
    dayYmd,
    fromYmd: chartRange?.from ?? null,
    toYmd: chartRange?.to ?? null,
    chartRange,
    rangeLocked: isDemo,
  };
}
