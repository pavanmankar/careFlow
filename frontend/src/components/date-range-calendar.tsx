'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplay(ymd: string) {
  const date = fromYmd(ymd);
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function yearOptions(min?: string, max?: string) {
  const now = new Date().getFullYear();
  const start = min ? Number(min.slice(0, 4)) : now - 120;
  const end = max ? Number(max.slice(0, 4)) : now + 5;
  const years: number[] = [];
  for (let year = Math.max(start, end); year >= Math.min(start, end); year -= 1) {
    years.push(year);
  }
  return years;
}

function CalendarPopup({
  cursor,
  setCursor,
  min,
  max,
  hint,
  children,
  onClose,
  trigger,
}: {
  cursor: Date;
  setCursor: (next: Date) => void;
  min?: string;
  max?: string;
  hint?: string;
  children: ReactNode;
  onClose: () => void;
  trigger: HTMLElement | null;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = 300;
    const height = 340;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight && rect.top > height ? rect.top - height - 8 : below;
    setPos({ top: Math.max(8, top), left });
  }, [trigger, cursor]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (trigger?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      onClose();
    }
    function onScroll() {
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      onClose();
    }
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, trigger]);

  const years = yearOptions(min, max);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[80] w-[300px] rounded-2xl bg-white p-4 shadow-[0_16px_40px_rgba(15,39,68,0.16)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="mb-3 flex items-center justify-between gap-1">
        <button
          type="button"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-navy-900"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-1">
          <select
            className="max-w-[8.5rem] rounded-lg border-0 bg-transparent py-1 text-sm font-semibold text-navy-900 outline-none"
            value={cursor.getMonth()}
            onChange={(event) => setCursor(new Date(cursor.getFullYear(), Number(event.target.value), 1))}
            aria-label="Month"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border-0 bg-transparent py-1 text-sm font-semibold text-navy-900 outline-none"
            value={cursor.getFullYear()}
            onChange={(event) => setCursor(new Date(Number(event.target.value), cursor.getMonth(), 1))}
            aria-label="Year"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-navy-900"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      {children}
      {hint ? <p className="mt-3 text-xs text-slate-500">{hint}</p> : null}
    </div>,
    document.body,
  );
}

function TriggerButton({
  open,
  compact,
  wide,
  disabled,
  filled,
  display,
  onClick,
  buttonRef,
}: {
  open: boolean;
  compact?: boolean;
  wide?: boolean;
  disabled?: boolean;
  filled: boolean;
  display: string;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-navy-900 shadow-sm outline-none transition hover:border-brand-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50',
        compact ? 'h-9' : 'h-[42px]',
        wide ? 'w-full' : compact ? 'w-52' : 'w-64',
        open && 'border-brand-500 ring-2 ring-brand-500/20',
      )}
    >
      <span className={filled ? 'text-navy-900' : 'text-slate-400'}>{display}</span>
      <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
    </button>
  );
}

function DayButton({
  date,
  ymd,
  outside,
  selected,
  ranged,
  disabled,
  onPick,
}: {
  date: Date;
  ymd: string;
  outside: boolean;
  selected: boolean;
  ranged?: boolean;
  disabled?: boolean;
  onPick: (ymd: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(ymd)}
      className={cn(
        'mx-auto flex h-9 w-9 items-center justify-center text-navy-900 transition',
        outside && 'text-slate-300',
        ranged && !selected && 'bg-brand-50',
        selected && 'bg-brand-500 font-semibold text-white',
        disabled && 'cursor-not-allowed text-slate-300',
        !selected && !disabled && 'hover:bg-slate-50',
      )}
    >
      {date.getDate()}
    </button>
  );
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  min,
  max,
  compact = false,
  wide = true,
  disabled = false,
  allowClear = false,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  compact?: boolean;
  wide?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => (value ? fromYmd(value) : new Date()));
  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  return (
    <div className={cn('relative', wide && 'w-full')}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-brand-600">{label}</span> : null}
      <TriggerButton
        buttonRef={buttonRef}
        open={open}
        compact={compact}
        wide={wide}
        disabled={disabled}
        filled={Boolean(value)}
        display={value ? formatDisplay(value) : placeholder}
        onClick={() => {
          if (disabled) {
            return;
          }
          setCursor(value ? fromYmd(value) : min ? fromYmd(min) : new Date());
          setOpen((current) => !current);
        }}
      />
      {open ? (
        <CalendarPopup
          cursor={cursor}
          setCursor={setCursor}
          min={min}
          max={max}
          trigger={buttonRef.current}
          onClose={() => setOpen(false)}
        >
          <div className="grid grid-cols-7 text-center text-sm">
            {cells.map((date) => {
              const ymd = toYmd(date);
              const blocked = Boolean((min && ymd < min) || (max && ymd > max));
              return (
                <DayButton
                  key={ymd + String(date.getMonth() !== cursor.getMonth())}
                  date={date}
                  ymd={ymd}
                  outside={date.getMonth() !== cursor.getMonth()}
                  selected={ymd === value}
                  disabled={blocked}
                  onPick={(next) => {
                    onChange(next);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
          {allowClear && value ? (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-brand-700 hover:underline"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear date
            </button>
          ) : null}
        </CalendarPopup>
      ) : null}
    </div>
  );
}

export function DateRangeCalendar({
  from,
  to,
  onChange,
  label = 'Appointment date: From-To',
  compact = false,
  min,
  max,
}: {
  from: string | null;
  to: string | null;
  onChange: (next: { from: string | null; to: string | null }) => void;
  label?: string;
  compact?: boolean;
  min?: string;
  max?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => (from ? fromYmd(from) : new Date()));
  const [picking, setPicking] = useState<string | null>(null);
  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const rangeStart = picking ?? from;
  const rangeEnd = picking ? picking : to;
  const display =
    from && to ? (from === to ? formatDisplay(from) : `${formatDisplay(from)} – ${formatDisplay(to)}`) : 'Select Dates';

  function pick(ymd: string) {
    if (!picking) {
      setPicking(ymd);
      return;
    }
    const start = picking <= ymd ? picking : ymd;
    const end = picking <= ymd ? ymd : picking;
    onChange({ from: start, to: end });
    setPicking(null);
    setOpen(false);
  }

  function inRange(ymd: string) {
    if (!rangeStart || !rangeEnd) {
      return false;
    }
    const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return ymd >= start && ymd <= end;
  }

  return (
    <div className="relative w-full min-w-[12rem] max-w-[16rem] shrink-0 sm:w-auto">
      {label ? <span className="mb-1.5 block text-sm font-medium text-brand-600">{label}</span> : null}
      <div className="flex items-center gap-2">
        <TriggerButton
          buttonRef={buttonRef}
          open={open}
          compact={compact}
          wide
          filled={Boolean(from && to)}
          display={display}
          onClick={() => {
            setCursor(from ? fromYmd(from) : new Date());
            setPicking(null);
            setOpen((current) => !current);
          }}
        />
        {!compact && (from || to) ? (
          <Button
            type="button"
            variant="secondary"
            className="h-[42px] rounded-full border-brand-500 px-4 text-brand-700"
            onClick={() => {
              onChange({ from: null, to: null });
              setPicking(null);
              setOpen(false);
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
      {open ? (
        <CalendarPopup
          cursor={cursor}
          setCursor={setCursor}
          min={min}
          max={max}
          trigger={buttonRef.current}
          onClose={() => {
            setOpen(false);
            setPicking(null);
          }}
          hint={picking ? 'Select the end date' : 'Select a start date, then an end date'}
        >
          <div className="grid grid-cols-7 text-center text-sm">
            {cells.map((date) => {
              const ymd = toYmd(date);
              const blocked = Boolean((min && ymd < min) || (max && ymd > max));
              return (
                <DayButton
                  key={ymd + String(date.getMonth() !== cursor.getMonth())}
                  date={date}
                  ymd={ymd}
                  outside={date.getMonth() !== cursor.getMonth()}
                  selected={ymd === rangeStart || ymd === rangeEnd}
                  ranged={inRange(ymd)}
                  disabled={blocked}
                  onPick={pick}
                />
              );
            })}
          </div>
        </CalendarPopup>
      ) : null}
    </div>
  );
}
