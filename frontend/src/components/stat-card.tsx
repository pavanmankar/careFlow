import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  pending = false,
  trend,
}: {
  label: string;
  value?: string | number;
  icon: LucideIcon;
  pending?: boolean;
  trend?: string;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-slate-500">{label}</div>
        {pending ? (
          <div className="mt-1 text-sm font-medium text-brand-700">In Progress</div>
        ) : (
          <div className="mt-0.5 truncate text-2xl font-semibold text-navy-900">{value ?? '—'}</div>
        )}
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </div>
    </Card>
  );
}
