'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';

const MIN_SEARCH_CHARS = 3;

export function useAppliedSearch(value: string) {
  const [applied, setApplied] = useState('');

  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setApplied('');
      return;
    }
    if (term.length >= MIN_SEARCH_CHARS) {
      setApplied(term);
    }
  }, [value]);

  return applied;
}

export function ListSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0 shrink-0', className ?? 'w-56')}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
      />
    </div>
  );
}
