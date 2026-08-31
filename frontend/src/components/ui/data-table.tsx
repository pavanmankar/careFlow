import { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export function DataTable({
  children,
  className,
  loading,
}: {
  children: ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <Card className={cn('relative overflow-x-auto p-0', className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : null}
      <table className="w-full text-left text-sm">{children}</table>
    </Card>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-[#F8FAFC] text-xs font-medium uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function Th({ children, className, ...props }: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-6 py-3.5 font-medium', className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-6 py-3.5 text-slate-600', className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-t border-slate-100 hover:bg-slate-50/60">{children}</tr>;
}
