'use client';

import { Card } from '@/components/ui/card';
import { previewAppointments } from '@/lib/medlink-data';
import { PersonPhoto } from '@/components/person-photo';

export default function NotificationsPage() {
  return (
    <Card className="p-0">
      <ul className="divide-y divide-slate-100">
        {previewAppointments.map((row) => (
          <li key={row.id} className="flex items-center gap-3 px-5 py-4">
            <PersonPhoto src={row.patient.photo} name={row.patient.name} />
            <div>
              <div className="text-sm text-navy-900">
                {row.patient.name} · {row.type} at {row.time}
              </div>
              <div className="text-xs text-slate-400">{row.doctor.name}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
