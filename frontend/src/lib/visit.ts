export type DocumentKind = 'Consent' | 'X-ray' | 'Photo';
export type VisitStatus = 'Confirmed' | 'In progress' | 'Completed' | 'Cancelled' | 'Expired';

export interface VisitMedicine {
  id?: string;
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface VisitDocument {
  id?: string;
  fileName: string;
  kind: DocumentKind;
  url: string;
}

export interface VisitCharge {
  id?: string;
  chargeFor: string;
  amount: number;
}

export interface VisitDetail {
  id: string;
  type: string;
  status: VisitStatus;
  startsAt: number;
  endsAt: number;
  reasonForVisit: string | null;
  pastHistory: string | null;
  habits: string | null;
  internalNote: string | null;
  cancelReason: string | null;
  taxPercent: number;
  checkedInAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    gender: string | null;
    bloodGroup: string | null;
    dateOfBirth: number | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    currentMedicines: string | null;
  };
  doctor: { id: string; name: string; specialty: string };
  recentVisits: Array<{
    id: string;
    date: number;
    type: string;
    status: string;
    doctor: string;
    reasonForVisit: string | null;
    examination: string | null;
    treatment: string | null;
    medicines: Array<Pick<VisitMedicine, 'medicine' | 'dose' | 'frequency' | 'duration' | 'instructions'>>;
  }>;
  vitals: {
    bpSystolic: number | null;
    bpDiastolic: number | null;
    pulse: number | null;
    temperature: number | null;
    spo2: number | null;
    weightKg: number | null;
    heightCm: number | null;
    bmi: number | null;
    recordedAt: number | null;
  } | null;
  procedures: { examination: string | null; treatment: string | null };
  medicines: VisitMedicine[];
  documents: VisitDocument[];
  charges: VisitCharge[];
}

export function rupees(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function taxOnAmount(amount: number, taxPercent: number) {
  return Math.round((amount * taxPercent) / 100);
}

export function chargeTotals(charges: VisitCharge[], taxPercent: number) {
  const amount = charges.reduce((sum, row) => sum + row.amount, 0);
  const tax = taxOnAmount(amount, taxPercent);
  const amountWithTax = amount + tax;
  return { amount, tax, amountWithTax };
}

export function computeBmi(weightKg: string, heightCm: string) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!weight || !height) {
    return '';
  }
  const meters = height / 100;
  return String(Math.round((weight / (meters * meters)) * 10) / 10);
}

export function emptyMedicine(): VisitMedicine {
  return { medicine: '', dose: '', frequency: '', duration: '', instructions: '' };
}

export function emptyDocument(): VisitDocument {
  return { fileName: '', kind: 'Consent', url: '' };
}

export function emptyCharge(): VisitCharge {
  return { chargeFor: '', amount: 0 };
}
