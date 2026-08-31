import { cn } from '@/lib/cn';

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-24 w-24',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-12 w-12',
};

export function StaffAvatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl bg-mint text-brand-600',
        sizes[size],
      )}
    >
      <svg viewBox="0 0 24 24" className={iconSizes[size]} fill="none" aria-hidden>
        <circle cx="11" cy="8" r="3.15" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M15.8 6.8c.9.45 1.55 1.45 1.55 2.55"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M4.8 19.2c.55-3.35 3.05-5.2 6.2-5.2 3.15 0 5.65 1.85 6.2 5.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
