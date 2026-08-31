'use client';

import { usePortalId } from '@/components/portal-navigation';
import { BackLink } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { PersonPhoto } from '@/components/person-photo';
import { previewDepartments, previewDoctors } from '@/lib/medlink-data';

export default function DepartmentDetailPage() {
  const params = { id: usePortalId() };
  const dept = previewDepartments.find((row) => row.id === params.id) ?? previewDepartments[0];
  const team = previewDoctors.filter((doc) => doc.specialty === dept.name).concat(previewDoctors.slice(0, 3));

  return (
    <div>
      <BackLink href="/departments" label={dept.name} heading />
      <img src={dept.photo} alt={dept.name} className="mb-6 h-52 w-full rounded-2xl object-cover" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-navy-900">Department lead</h2>
          <div className="mt-4 flex items-center gap-3">
            <PersonPhoto src={dept.lead.photo} name={dept.lead.name} size="lg" />
            <div>
              <div className="font-medium text-navy-900">{dept.lead.name}</div>
              <div className="text-sm text-slate-500">{dept.lead.specialty}</div>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-navy-900">Doctors</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {team.slice(0, 4).map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 rounded-xl bg-canvas p-3">
                <PersonPhoto src={doc.photo} name={doc.name} />
                <div>
                  <div className="text-sm font-medium text-navy-900">{doc.name}</div>
                  <div className="text-xs text-slate-500">{doc.hours}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
