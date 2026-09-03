'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { DateRangeCalendar } from '@/components/date-range-calendar';
import { useDemoDates } from '@/components/demo-date-context';

export const CHART_PERIODS = [
  { value: 'current', label: 'Current month' },
  { value: 'last', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Year' },
  { value: 'custom', label: 'Custom' },
] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number]['value'];

export function chartQueryString(period: ChartPeriod, from: string | null, to: string | null) {
  const params = new URLSearchParams({ period });
  if (period === 'custom' && from && to) {
    params.set('from', from);
    params.set('to', to);
  }
  return params.toString();
}

export function useChartRange() {
  const { chartRange, rangeLocked } = useDemoDates();
  const [period, setPeriod] = useState<ChartPeriod>('current');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const effectivePeriod = rangeLocked && chartRange ? chartRange.period : period;
  const effectiveFrom = rangeLocked && chartRange ? chartRange.from : from;
  const effectiveTo = rangeLocked && chartRange ? chartRange.to : to;

  return {
    ready: effectivePeriod !== 'custom' || Boolean(effectiveFrom && effectiveTo),
    query: chartQueryString(effectivePeriod, effectiveFrom, effectiveTo),
    controlProps: {
      period: effectivePeriod,
      from: effectiveFrom,
      to: effectiveTo,
      locked: rangeLocked,
      onPeriodChange: setPeriod,
      onCustomChange: (next: { from: string | null; to: string | null }) => {
        setFrom(next.from);
        setTo(next.to);
      },
    },
  };
}

export function ChartRangeControl({
  period,
  from,
  to,
  locked = false,
  onPeriodChange,
  onCustomChange,
}: {
  period: ChartPeriod;
  from: string | null;
  to: string | null;
  locked?: boolean;
  onPeriodChange: (period: ChartPeriod) => void;
  onCustomChange: (next: { from: string | null; to: string | null }) => void;
}) {
  if (locked) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        className="w-40 py-2"
        value={period}
        onChange={(event) => onPeriodChange(event.target.value as ChartPeriod)}
        aria-label="Date range"
      >
        {CHART_PERIODS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {period === 'custom' ? (
        <DateRangeCalendar compact label="" from={from} to={to} onChange={onCustomChange} />
      ) : null}
    </div>
  );
}
