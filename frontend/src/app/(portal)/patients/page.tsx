'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { api, getActiveLocationId } from '@/lib/api';
import { DataTable, TableHead, Th, Td, Tr } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE, Pagination } from '@/components/ui/pagination';
import { IconLink } from '@/components/ui/icon-button';
import { ListSearch, useAppliedSearch } from '@/components/list-search';
import { StaffAvatar } from '@/components/staff-avatar';
import { ageLabel, formatClinicDate, type ClinicPatient } from '@/lib/clinic';

interface Me {
  business: { timezone: string } | null;
}

export default function PatientsPage() {
  const locationId = getActiveLocationId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const appliedSearch = useAppliedSearch(search);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/api/v1/auth/me') });
  const timezone = me.data?.business?.timezone ?? 'Asia/Kolkata';
  useEffect(() => {
    setPage(1);
  }, [appliedSearch]);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(DEFAULT_PAGE_SIZE),
  });
  if (appliedSearch) {
    params.set('search', appliedSearch);
  }
  const patients = useQuery({
    queryKey: ['patients', locationId, page, appliedSearch],
    queryFn: () =>
      api.get<{ items: ClinicPatient[]; total: number }>(`/api/v1/patients?${params.toString()}`),
  });
  const items = patients.data?.items ?? [];

  return (
    <div>
    <div className="mb-4 flex justify-start">
      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder="Search patient"
      />
    </div>
    <DataTable loading={patients.isLoading}>
      <TableHead>
        <tr>
          <Th>Patient</Th>
          <Th>Gender</Th>
          <Th>Blood</Th>
          <Th>Last visit</Th>
          <Th />
        </tr>
      </TableHead>
      <tbody>
        {items.map((patient) => (
          <Tr key={patient.id}>
            <Td>
              <Link href={`/patients/${patient.id}`} className="flex items-center gap-3 font-medium text-navy-900">
                <StaffAvatar name={patient.name} />
                <span>
                  {patient.name}
                  <span className="block text-xs font-normal text-slate-400">{ageLabel(patient.age)}</span>
                </span>
              </Link>
            </Td>
            <Td>{patient.gender || '—'}</Td>
            <Td>{patient.bloodGroup || '—'}</Td>
            <Td className="text-slate-500">{patient.lastVisitAt ? formatClinicDate(patient.lastVisitAt, timezone) : '—'}</Td>
            <Td className="text-right">
              <IconLink href={`/patients/${patient.id}`} icon={Eye} label="View patient" />
            </Td>
          </Tr>
        ))}
        {!patients.isLoading && items.length === 0 && (
          <Tr>
            <Td colSpan={5} className="py-10 text-center text-sm text-slate-500">
              No patients {appliedSearch ? 'match that name.' : 'yet. They appear here after the first appointment is booked.'}
            </Td>
          </Tr>
        )}
      </tbody>
    </DataTable>
      <Pagination page={page} total={patients.data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
