'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export const DEFAULT_PAGE_SIZE = 10;

function visiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const marks = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...marks].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(sorted[index]);
  }
  return items;
}

export function Pagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  onPageChange,
}: {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= 0) {
    return null;
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const pages = visiblePages(current, pageCount);

  return (
    <div className="flex flex-col gap-3 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`e-${index}`} className="px-2 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                'inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-medium transition',
                item === current ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
