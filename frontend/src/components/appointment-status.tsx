export function AppointmentStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed: 'bg-blue-50 text-blue-700',
    'In progress': 'bg-sky-50 text-sky-700',
    Completed: 'bg-emerald-50 text-emerald-700',
    Cancelled: 'bg-red-50 text-red-700',
    Expired: 'bg-orange-50 text-orange-700',
    Low: 'bg-amber-50 text-amber-700',
    'Low stock': 'bg-amber-50 text-amber-700',
    Critical: 'bg-red-50 text-red-700',
    'In stock': 'bg-emerald-50 text-emerald-700',
    Available: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
