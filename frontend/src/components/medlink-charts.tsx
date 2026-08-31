'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { rupees } from '@/lib/visit';

const TEAL = '#4FA0AB';

function ChartTooltip({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ color: string; label: string; value: string }>;
}) {
  return (
    <div className="pointer-events-none absolute z-10 w-max min-w-[128px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md animate-chartTip">
      <p className="mb-1.5 font-medium text-navy-900">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </span>
            <span className="font-medium text-navy-900">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaChart({ values, color = TEAL }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const width = 560;
  const height = 180;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 16) - 8;
    return `${x},${y}`;
  });
  const line = points.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Trend">
      <defs>
        <linearGradient id={`area-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#area-${color.replace('#', '')})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type SeriesFormat = 'number' | 'currency';

export type LineSeries = {
  label: string;
  values: number[];
  color: string;
  format?: SeriesFormat;
};

function axisTicks(labels: string[], maxTicks = 8) {
  if (labels.length <= maxTicks) {
    return labels.map((label, index) => ({ label, index }));
  }
  const step = Math.ceil((labels.length - 1) / (maxTicks - 1));
  const ticks: Array<{ label: string; index: number }> = [];
  for (let index = 0; index < labels.length; index += step) {
    ticks.push({ label: labels[index], index });
  }
  const lastIndex = labels.length - 1;
  if (ticks[ticks.length - 1]?.index !== lastIndex) {
    ticks.push({ label: labels[lastIndex], index: lastIndex });
  }
  return ticks;
}

function niceCeil(max: number) {
  if (max <= 0) {
    return 1;
  }
  if (max <= 4) {
    return Math.max(4, Math.ceil(max));
  }
  const exp = 10 ** Math.floor(Math.log10(max));
  const n = max / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * exp;
}

function scaleTicks(maxValue: number, count = 4) {
  const max = niceCeil(maxValue);
  return Array.from({ length: count + 1 }, (_, index) => (max * index) / count);
}

function formatSeriesValue(value: number, format: SeriesFormat = 'number') {
  if (format === 'currency') {
    return rupees(Math.round(value));
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatAxisValue(value: number, format: SeriesFormat = 'number') {
  if (format === 'currency') {
    if (value === 0) {
      return '₹0';
    }
    if (value >= 100000) {
      const lakhs = value / 100000;
      return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
    }
    if (value >= 1000) {
      const thousands = value / 1000;
      return `₹${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
    }
    return rupees(Math.round(value));
  }
  return String(Math.round(value));
}

export function LineChart({
  series,
  labels,
  independentScale = false,
}: {
  series: LineSeries[];
  labels?: string[];
  independentScale?: boolean;
}) {
  const width = 640;
  const height = 180;
  const padLeft = 48;
  const padRight = independentScale && series.length > 1 ? 56 : 28;
  const padTop = 12;
  const padBottom = 28;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const axisLabels = labels ?? MONTH_LABELS;
  const pointCount = Math.max(...series.map((row) => row.values.length), axisLabels.length, 1);
  const lastIndex = Math.max(pointCount - 1, 0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const xTicks = axisTicks(axisLabels, axisLabels.length <= 12 ? 12 : 7);
  const sharedMax = niceCeil(Math.max(...series.flatMap((row) => row.values), 1));
  const leftSeries = series[0];
  const rightSeries = independentScale ? series[1] : undefined;
  const leftMax = niceCeil(Math.max(...(leftSeries?.values ?? [0]), 1));
  const rightMax = niceCeil(Math.max(...(rightSeries?.values ?? [0]), 1));
  const leftTicks = scaleTicks(independentScale ? leftMax : sharedMax);
  const rightTicks = rightSeries ? scaleTicks(rightMax) : [];

  const seriesMeta = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        max: independentScale ? niceCeil(Math.max(...row.values, 1)) : sharedMax,
      })),
    [independentScale, series, sharedMax],
  );

  function xAt(index: number) {
    return padLeft + (index / Math.max(pointCount - 1, 1)) * plotWidth;
  }

  function yAt(value: number, max: number) {
    return padTop + plotHeight - (value / max) * plotHeight;
  }

  function onMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * width;
    const step = plotWidth / Math.max(lastIndex, 1);
    if (x >= xAt(lastIndex) - step / 2) {
      setHoverIndex(lastIndex);
      return;
    }
    const t = (x - padLeft) / plotWidth;
    setHoverIndex(Math.round(Math.min(1, Math.max(0, t)) * lastIndex));
  }

  const hoverX = hoverIndex === null ? null : xAt(hoverIndex);
  const flipTooltip = hoverX !== null && hoverX / width > 0.55;
  const activeTickIndex =
    hoverIndex === null
      ? null
      : xTicks.reduce((best, tick) =>
          Math.abs(tick.index - hoverIndex) < Math.abs(best.index - hoverIndex) ? tick : best,
        ).index;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-44 w-full cursor-crosshair"
          role="img"
          aria-label={`${series.map((row) => row.label).join(' and ')} over time`}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
        {leftTicks.map((tick) => {
          const y = yAt(tick, independentScale ? leftMax : sharedMax);
          return (
            <g key={`grid-${tick}`}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#E8EEF4" strokeWidth="1" />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="10">
                {formatAxisValue(tick, leftSeries?.format)}
              </text>
            </g>
          );
        })}
        {rightSeries
          ? rightTicks.map((tick) => {
              const y = yAt(tick, rightMax);
              return (
                <text
                  key={`right-${tick}`}
                  x={width - padRight + 6}
                  y={y + 3}
                  textAnchor="start"
                  fill="#94A3B8"
                  fontSize="10"
                >
                  {formatAxisValue(tick, rightSeries.format)}
                </text>
              );
            })
          : null}
        {xTicks.map((tick, tickIndex) => (
          <text
            key={`${tick.index}-${tick.label}`}
            x={xAt(tick.index)}
            y={height - 8}
            textAnchor={tickIndex === 0 ? 'start' : 'middle'}
            fill={activeTickIndex === tick.index ? '#0B1C2C' : '#64748B'}
            fontSize="10"
            fontWeight={activeTickIndex === tick.index ? 600 : 400}
          >
            {tick.label}
          </text>
        ))}
        {seriesMeta.map((row) => {
          const linePoints = row.values
            .map((value, index) => `${xAt(index)},${yAt(value, row.max)}`)
            .join(' ');
          const areaPoints = `${xAt(0)},${padTop + plotHeight} ${linePoints} ${xAt(Math.max(row.values.length - 1, 0))},${padTop + plotHeight}`;
          const gradientId = `line-fill-${row.color.replace('#', '')}`;
          return (
            <g key={row.label}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={row.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={row.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon points={areaPoints} fill={`url(#${gradientId})`} className="transition-opacity duration-200" />
              <polyline
                points={linePoints}
                fill="none"
                stroke={row.color}
                strokeWidth={hoverIndex === null ? 2.5 : 3}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="transition-[stroke-width] duration-200"
              />
            </g>
          );
        })}
        {hoverIndex !== null && hoverX !== null ? (
          <g>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padTop}
              y2={padTop + plotHeight}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeOpacity="0.9"
            />
            {seriesMeta.map((row) => {
              const cy = yAt(row.values[hoverIndex] ?? 0, row.max);
              return (
                <g key={`dot-${row.label}`}>
                  <circle cx={hoverX} cy={cy} r="8" fill={row.color} fillOpacity="0.16">
                    <animate attributeName="r" values="6;9;6" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={hoverX} cy={cy} r="4" fill="#fff" stroke={row.color} strokeWidth="2" />
                </g>
              );
            })}
          </g>
        ) : null}
        </svg>
        {hoverIndex !== null && hoverX !== null ? (
          <div
            className="pointer-events-none absolute top-3 z-10"
            style={{
              left: `${(hoverX / width) * 100}%`,
              transform: flipTooltip ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
            }}
          >
            <ChartTooltip
              title={axisLabels[hoverIndex] ?? ''}
              rows={series.map((row) => ({
                color: row.color,
                label: row.label,
                value: formatSeriesValue(row.values[hoverIndex] ?? 0, row.format),
              }))}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        {series.map((row) => (
          <span key={row.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
            {row.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart({
  groups,
  aLabel = 'Male',
  bLabel = 'Female',
}: {
  groups: Array<{ label: string; male?: number; female?: number; a?: number; b?: number }>;
  aLabel?: string;
  bLabel?: string;
}) {
  const values = groups.map((group) => ({
    label: group.label,
    a: group.a ?? group.male ?? 0,
    b: group.b ?? group.female ?? 0,
  }));
  const max = Math.max(...values.flatMap((group) => [group.a, group.b]), 1);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div>
      <div className="flex h-44 items-end gap-4 overflow-visible">
        {values.map((group, index) => {
          const active = hover === group.label;
          const dim = hover !== null && !active;
          return (
            <div
              key={group.label}
              className="relative flex flex-1 flex-col items-center gap-2"
              onMouseEnter={() => setHover(group.label)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex h-36 w-full items-end justify-center gap-1">
                <div
                  className="w-3 origin-bottom rounded-t-md bg-brand-500 transition-all duration-200 ease-out"
                  style={{
                    height: `${(group.a / max) * 100}%`,
                    transform: active ? 'scaleX(1.25)' : 'scaleX(1)',
                    opacity: dim ? 0.4 : 1,
                  }}
                />
                <div
                  className="w-3 origin-bottom rounded-t-md bg-[#F4A261] transition-all duration-200 ease-out"
                  style={{
                    height: `${(group.b / max) * 100}%`,
                    transform: active ? 'scaleX(1.25)' : 'scaleX(1)',
                    opacity: dim ? 0.4 : 1,
                  }}
                />
              </div>
              <span className={`text-[8px] transition-colors duration-200 ${active ? 'font-medium text-navy-900' : 'text-slate-500'}`}>
                {group.label}
              </span>
              {active ? (
                <div className={`absolute bottom-full mb-2 ${index >= values.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                  <ChartTooltip
                    title={group.label}
                    rows={[
                      { color: '#4FA0AB', label: aLabel, value: String(group.a) },
                      { color: '#F4A261', label: bLabel, value: String(group.b) },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          {aLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F4A261]" />
          {bLabel}
        </span>
      </div>
    </div>
  );
}

export function SimpleBarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-3">
      {values.map((value, index) => (
        <div key={labels[index] ?? index} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end justify-center">
            <div className="w-6 rounded-t-md bg-brand-500" style={{ height: `${(value / max) * 100}%` }} />
          </div>
          <span className="text-[8px] text-slate-500">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  slices,
}: {
  slices: Array<{ label: string; value: number; color: string; count?: number }>;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const [hover, setHover] = useState<string | null>(null);
  let offset = 0;
  const radius = 36;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="relative flex items-center gap-6">
      <svg viewBox="0 0 96 96" className="h-28 w-28 -rotate-90 overflow-visible">
        {slices.map((slice) => {
          const length = (slice.value / total) * circ;
          const dash = `${length} ${circ - length}`;
          const current = offset;
          offset += length;
          const active = hover === slice.label;
          const dim = hover !== null && !active;
          return (
            <circle
              key={slice.label}
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={active ? 15 : 12}
              strokeDasharray={dash}
              strokeDashoffset={-current}
              className="cursor-pointer transition-all duration-200 ease-out"
              style={{ opacity: dim ? 0.35 : 1 }}
              onMouseEnter={() => setHover(slice.label)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <ul className="w-full space-y-1 text-sm">
        {slices.map((slice) => {
          const active = hover === slice.label;
          return (
            <li
              key={slice.label}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-slate-600 transition-colors duration-200 ${
                active ? 'bg-slate-50 text-navy-900' : hover ? 'opacity-50' : ''
              }`}
              onMouseEnter={() => setHover(slice.label)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              {slice.label}
              <span className="ml-auto flex items-center gap-3">
                <span className="font-medium text-navy-900">{slice.value}%</span>
                {slice.count != null ? <span className="min-w-[2rem] text-right text-slate-500">{slice.count}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {hover ? (
        <div className="absolute left-0 top-0">
          <ChartTooltip
            title={hover}
            rows={(() => {
              const slice = slices.find((row) => row.label === hover);
              if (!slice) {
                return [];
              }
              const count = slice.count ?? slice.value;
              return [
                { color: slice.color, label: 'Share', value: `${slice.value}%` },
                { color: slice.color, label: 'Count', value: String(count) },
              ];
            })()}
          />
        </div>
      ) : null}
    </div>
  );
}
