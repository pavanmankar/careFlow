import { Clock3 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function InProgress({
  title = 'In Progress',
  description = 'Backend for this module will be added in a later phase.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Clock3 className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </Card>
  );
}
