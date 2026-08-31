'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PersonPhoto } from '@/components/person-photo';
import { previewDepartments } from '@/lib/medlink-data';

export default function DepartmentsPage() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {previewDepartments.map((dept) => (
        <Link key={dept.id} href={`/departments/${dept.id}`}>
          <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md">
            <img src={dept.photo} alt={dept.name} className="h-36 w-full object-cover" />
            <div className="p-5">
              <h2 className="text-lg font-semibold text-navy-900">{dept.name}</h2>
              <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
                <PersonPhoto src={dept.lead.photo} name={dept.lead.name} size="sm" />
                {dept.lead.name}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                <div className="rounded-xl bg-canvas py-2">
                  <div className="text-sm font-semibold text-navy-900">{dept.doctors}</div>
                  Doctors
                </div>
                <div className="rounded-xl bg-canvas py-2">
                  <div className="text-sm font-semibold text-navy-900">{dept.patients}</div>
                  Patients
                </div>
                <div className="rounded-xl bg-canvas py-2">
                  <div className="text-sm font-semibold text-navy-900">{dept.rooms}</div>
                  Rooms
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
