import { type ReactNode } from 'react';
import { formatAddress, type Address } from '@/lib/address';
import { ageFromDob, ageLabel, formatClinicDate, formatSlotLabel, hourInTimeZone } from '@/lib/clinic';
import { chargeTotals, rupees, type VisitDetail, type VisitMedicine } from '@/lib/visit';

export interface ClinicLetterhead {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  timezone?: string;
  address: Address | null;
}

export function printVisitDocument() {
  const sheet = document.querySelector('.visit-print-sheet');
  if (!(sheet instanceof HTMLElement)) {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;background:#fff;';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write('<!DOCTYPE html><html><head><title></title></head><body></body></html>');
  frameDoc.close();
  frameDoc.title = '';
  frameDoc.documentElement.className = document.documentElement.className;
  frameDoc.body.className = document.body.className;

  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    frameDoc.head.appendChild(node.cloneNode(true));
  });

  const pageStyle = frameDoc.createElement('style');
  pageStyle.textContent = `
    @page { size: A4; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: #fff;
      font-family: var(--font-jakarta), Inter, ui-sans-serif, system-ui, sans-serif;
      color: #0b1c2c;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .visit-print-clone hr {
      border: 0;
      border-top: 2px solid #4FA0AB;
    }
    .visit-print-sheet,
    .visit-print-clone {
      display: block !important;
      width: 210mm !important;
      max-width: none !important;
      margin: 0 !important;
      box-shadow: none !important;
      padding: 16mm !important;
      box-sizing: border-box !important;
    }
    .visit-print-clone .grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      width: 100% !important;
    }
    .visit-print-clone table {
      width: 100% !important;
    }
  `;
  frameDoc.head.appendChild(pageStyle);

  const clone = sheet.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    iframe.remove();
    return;
  }
  clone.classList.add('visit-print-clone');
  frameDoc.body.appendChild(clone);

  const cleanup = () => {
    iframe.remove();
    frameWin.removeEventListener('afterprint', cleanup);
  };
  frameWin.addEventListener('afterprint', cleanup);

  const runPrint = () => frameWin.print();
  const wait = frameDoc.fonts?.ready ?? Promise.resolve();
  void wait
    .then(() => new Promise((resolve) => window.setTimeout(resolve, 50)))
    .then(runPrint)
    .catch(runPrint);
}

export function VisitSummaryDocument({
  visit,
  clinic,
  timezone,
}: {
  visit: VisitDetail;
  clinic: ClinicLetterhead;
  timezone: string;
}) {
  const vitals = visit.vitals;
  const vitalRows = vitals
    ? ([
        vitals.bpSystolic != null || vitals.bpDiastolic != null
          ? ['BP', [vitals.bpSystolic, vitals.bpDiastolic].filter((n) => n != null).join('/') + ' mmHg']
          : null,
        vitals.pulse != null ? ['Pulse', `${vitals.pulse} bpm`] : null,
        vitals.temperature != null ? ['Temp', `${vitals.temperature} °C`] : null,
        vitals.spo2 != null ? ['SpO₂', `${vitals.spo2}%`] : null,
        vitals.weightKg != null ? ['Weight', `${vitals.weightKg} kg`] : null,
        vitals.heightCm != null ? ['Height', `${vitals.heightCm} cm`] : null,
        vitals.bmi != null ? ['BMI', String(vitals.bmi)] : null,
      ].filter(Boolean) as Array<[string, string]>)
    : [];
  const totals = chargeTotals(visit.charges, visit.taxPercent);

  return (
    <PrintSheet>
      <Letterhead clinic={clinic} subtitle="Visit summary" />
      <div className="mt-5 text-left text-sm">
        <PatientVisitMeta visit={visit} timezone={timezone} />

        {visit.reasonForVisit || visit.pastHistory || visit.habits || visit.patient.chronicConditions ? (
          <SummaryBlock title="Reason / notes">
            <Note label="Reason for visit" value={visit.reasonForVisit} />
            <Note label="Past history" value={visit.pastHistory} />
            <Note label="Habits" value={visit.habits} />
            <Note label="Chronic conditions" value={visit.patient.chronicConditions} />
          </SummaryBlock>
        ) : null}

        <SummaryBlock title="Vitals">
          {vitalRows.length ? (
            <div className="flex w-full flex-wrap justify-between gap-y-1">
              {vitalRows.map(([label, value]) => (
                <p key={label}>
                  <span className="text-slate-400">{label}: </span>
                  {value}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No vitals recorded.</p>
          )}
        </SummaryBlock>

        {visit.procedures.examination || visit.procedures.treatment ? (
          <SummaryBlock title="Examination / treatment">
            <Note label="Examination" value={visit.procedures.examination} />
            <Note label="Treatment" value={visit.procedures.treatment} />
          </SummaryBlock>
        ) : null}

        <SummaryBlock title="Charges">
          {visit.charges.length ? (
            <>
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="border border-slate-200 px-2 py-1.5 font-medium">Charge for</th>
                    <th className="border border-slate-200 px-2 py-1.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.charges.map((item, index) => (
                    <tr key={item.id ?? `${item.chargeFor}-${index}`}>
                      <td className="border border-slate-200 px-2 py-1.5">{item.chargeFor}</td>
                      <td className="border border-slate-200 px-2 py-1.5">{rupees(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="mt-3 ml-auto w-full max-w-[220px] space-y-1 text-xs">
                <div className="flex justify-between gap-4 text-slate-500">
                  <dt>Amount</dt>
                  <dd>{rupees(totals.amount)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-slate-500">
                  <dt>Tax{visit.taxPercent ? ` (${visit.taxPercent}%)` : ''}</dt>
                  <dd>{rupees(totals.tax)}</dd>
                </div>
                <div className="flex justify-between gap-4 font-semibold text-navy-900">
                  <dt>Total amount</dt>
                  <dd>{rupees(totals.amountWithTax)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-slate-500">No charges.</p>
          )}
        </SummaryBlock>

        <DoctorSignOff visit={visit} timezone={timezone} />
      </div>
    </PrintSheet>
  );
}

export function VisitMedicinesDocument({
  visit,
  clinic,
  timezone,
}: {
  visit: VisitDetail;
  clinic: ClinicLetterhead;
  timezone: string;
}) {
  return (
    <PrintSheet>
      <Letterhead clinic={clinic} subtitle="Medicines prescribed" />
      <div className="mt-5 text-left text-sm">
        <PatientVisitMeta visit={visit} timezone={timezone} />
        <SummaryBlock title="Medicines">
          <MedicinesTable medicines={visit.medicines} />
        </SummaryBlock>
        <DoctorSignOff visit={visit} timezone={timezone} />
      </div>
    </PrintSheet>
  );
}

function PrintSheet({ children }: { children: ReactNode }) {
  return <article className="visit-print-sheet w-full bg-white px-10 py-8 text-navy-900">{children}</article>;
}

function Letterhead({ clinic, subtitle }: { clinic: ClinicLetterhead; subtitle: string }) {
  const address = formatAddress(clinic.address);
  const contact = [clinic.phone, clinic.email, clinic.website].map((part) => part?.trim()).filter(Boolean);
  return (
    <header className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{clinic.name || 'Clinic'}</h1>
      {clinic.legalName ? <p className="mt-0.5 text-sm text-slate-500">{clinic.legalName}</p> : null}
      {address ? <p className="mt-2 text-sm text-slate-600">{address}</p> : null}
      {contact.length ? <p className="mt-1 text-sm text-slate-600">{contact.join(' · ')}</p> : null}
      <hr className="mt-4 border-0 border-t-2 border-brand-500" />
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{subtitle}</p>
    </header>
  );
}

function PatientVisitMeta({ visit, timezone }: { visit: VisitDetail; timezone: string }) {
  const ageSex = [ageLabel(ageFromDob(visit.patient.dateOfBirth)), visit.patient.gender]
    .filter((part) => part && part !== '—')
    .join(' · ');
  const visitWhen = `${formatClinicDate(visit.startsAt, timezone)} · ${formatSlotLabel(hourInTimeZone(visit.startsAt, timezone))}`;
  return (
    <div className="mt-5 grid w-full grid-cols-2 gap-x-10 gap-y-2">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-900">Patient</h2>
        <p>
          <span className="font-medium">{visit.patient.name}</span>
          {ageSex ? <span className="text-slate-600"> · {ageSex}</span> : null}
        </p>
        <p>
          <span className="text-slate-400">Phone: </span>
          {visit.patient.phone || '—'}
        </p>
        {visit.patient.bloodGroup ? (
          <p>
            <span className="text-slate-400">Blood group: </span>
            {visit.patient.bloodGroup}
          </p>
        ) : null}
        {visit.patient.allergies ? (
          <p>
            <span className="text-slate-400">Allergies: </span>
            {visit.patient.allergies}
          </p>
        ) : null}
      </section>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-900">Visit</h2>
        <p>
          <span className="text-slate-400">Date: </span>
          {visitWhen}
        </p>
        <p>
          <span className="text-slate-400">Type: </span>
          {visit.type}
        </p>
        <p>
          <span className="text-slate-400">Doctor: </span>
          {visit.doctor.name}
          {visit.doctor.specialty ? ` · ${visit.doctor.specialty}` : ''}
        </p>
      </section>
    </div>
  );
}

function MedicinesTable({ medicines }: { medicines: VisitMedicine[] }) {
  if (!medicines.length) {
    return <p className="text-slate-500">No medicines prescribed.</p>;
  }
  return (
    <table className="w-full table-fixed border-collapse text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500">
          <th className="border border-slate-200 px-2 py-1.5 font-medium">Medicine</th>
          <th className="border border-slate-200 px-2 py-1.5 font-medium">Dose</th>
          <th className="border border-slate-200 px-2 py-1.5 font-medium">Frequency</th>
          <th className="border border-slate-200 px-2 py-1.5 font-medium">Duration</th>
          <th className="border border-slate-200 px-2 py-1.5 font-medium">Instructions</th>
        </tr>
      </thead>
      <tbody>
        {medicines.map((item, index) => (
          <tr key={item.id ?? `${item.medicine}-${index}`}>
            <td className="border border-slate-200 px-2 py-1.5 font-medium text-navy-900">{item.medicine}</td>
            <td className="border border-slate-200 px-2 py-1.5">{item.dose || '—'}</td>
            <td className="border border-slate-200 px-2 py-1.5">{item.frequency || '—'}</td>
            <td className="border border-slate-200 px-2 py-1.5">{item.duration || '—'}</td>
            <td className="border border-slate-200 px-2 py-1.5">{item.instructions || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DoctorSignOff({ visit, timezone }: { visit: VisitDetail; timezone: string }) {
  const name = /^\s*dr\.?\s/i.test(visit.doctor.name) ? visit.doctor.name : `Dr. ${visit.doctor.name}`;
  return (
    <footer className="mt-10 flex items-end justify-between gap-4 border-t border-slate-200 pt-6">
      <div>
        <p className="font-medium text-navy-900">{name}</p>
        {visit.doctor.specialty ? <p className="text-xs text-slate-500">{visit.doctor.specialty}</p> : null}
      </div>
      <p className="text-xs text-slate-400">Generated on {formatClinicDate(Date.now(), timezone)}</p>
    </footer>
  );
}

function SummaryBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

function Note({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <p className="mb-1">
      <span className="text-slate-400">{label}: </span>
      {value}
    </p>
  );
}
