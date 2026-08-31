import { cn } from '@/lib/cn';

export function ClinicLogo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5" aria-label="CareFlow">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect x="1" y="1" width="13" height="13" rx="4" fill={inverted ? '#ffffff' : '#4FA0AB'} />
        <rect x="18" y="1" width="13" height="13" rx="4" fill={inverted ? '#ffffff' : '#7BB8C0'} opacity={inverted ? 0.7 : 1} />
        <rect x="1" y="18" width="13" height="13" rx="4" fill={inverted ? '#ffffff' : '#7BB8C0'} opacity={inverted ? 0.7 : 1} />
        <rect x="18" y="18" width="13" height="13" rx="4" fill={inverted ? '#ffffff' : '#4FA0AB'} />
      </svg>
      {!compact && (
        <span className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-navy-900')}>
          CareFlow
        </span>
      )}
    </div>
  );
}
