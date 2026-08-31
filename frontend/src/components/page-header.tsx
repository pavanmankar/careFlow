import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  if (!title && !description && !actions) {
    return null;
  }
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {title && <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>}
        {description && <p className={title ? 'mt-1 text-sm text-slate-500' : 'text-sm text-slate-500'}>{description}</p>}
      </div>
      {actions}
    </div>
  );
}
