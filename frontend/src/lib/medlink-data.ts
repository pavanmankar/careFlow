export const photos = {
  doctors: [
    'https://images.unsplash.com/photo-1612348183646-eb4dc4da6bf0?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1651009757986-48f8092b0e02?auto=format&fit=crop&w=240&h=240&q=80',
  ],
  patients: [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&h=240&q=80',
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=240&h=240&q=80',
  ],
  departments: [
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=640&h=360&q=80',
    'https://images.unsplash.com/photo-1581595220892-b0739db3b8c5?auto=format&fit=crop&w=640&h=360&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=640&h=360&q=80',
    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=640&h=360&q=80',
    'https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&w=640&h=360&q=80',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=640&h=360&q=80',
  ],
  supplies: [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=160&h=160&q=80',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=160&h=160&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=160&h=160&q=80',
    'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=160&h=160&q=80',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=160&h=160&q=80',
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=160&h=160&q=80',
  ],
};

const peoplePhotos = [...photos.doctors, ...photos.patients];

export function dummyPersonPhoto(seed: string) {
  const key = seed.trim() || 'clinic-user';
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash + key.charCodeAt(index) * (index + 1)) % peoplePhotos.length;
  }
  return peoplePhotos[hash] ?? peoplePhotos[0];
}

export function avatarFromName(name: string) {
  return dummyPersonPhoto(name);
}

export const previewDoctors = [
  { id: 'd1', name: 'Dr. Amelia Hart', specialty: 'Cardiology', patients: 128, rating: 4.9, photo: photos.doctors[0], hours: '08:00 – 16:00' },
  { id: 'd2', name: 'Dr. Noah Patel', specialty: 'Neurology', patients: 96, rating: 4.8, photo: photos.doctors[1], hours: '09:00 – 17:00' },
  { id: 'd3', name: 'Dr. Sofia Alvarez', specialty: 'Pediatrics', patients: 142, rating: 4.9, photo: photos.doctors[2], hours: '08:30 – 15:30' },
  { id: 'd4', name: 'Dr. James Okonkwo', specialty: 'Orthopedics', patients: 88, rating: 4.7, photo: photos.doctors[3], hours: '10:00 – 18:00' },
  { id: 'd5', name: 'Dr. Mei Chen', specialty: 'Dermatology', patients: 110, rating: 4.8, photo: photos.doctors[4], hours: '09:00 – 16:30' },
  { id: 'd6', name: 'Dr. Luca Rossi', specialty: 'General', patients: 156, rating: 4.6, photo: photos.doctors[5], hours: '08:00 – 14:00' },
];

export const previewPatients = [
  { id: 'p1', name: 'Aisha Rahman', age: 34, gender: 'Female', blood: 'O+', lastVisit: '12 Aug 2026', condition: 'Hypertension', photo: photos.patients[0], phone: '+91 98765 11001' },
  { id: 'p2', name: 'Daniel Brooks', age: 52, gender: 'Male', blood: 'A+', lastVisit: '11 Aug 2026', condition: 'Diabetes', photo: photos.patients[1], phone: '+91 98765 11002' },
  { id: 'p3', name: 'Priya Nair', age: 28, gender: 'Female', blood: 'B+', lastVisit: '10 Aug 2026', condition: 'Follow-up', photo: photos.patients[2], phone: '+91 98765 11003' },
  { id: 'p4', name: 'Omar Haddad', age: 41, gender: 'Male', blood: 'O-', lastVisit: '09 Aug 2026', condition: 'Asthma', photo: photos.patients[3], phone: '+91 98765 11004' },
  { id: 'p5', name: 'Elena Popov', age: 63, gender: 'Female', blood: 'AB+', lastVisit: '08 Aug 2026', condition: 'Arthritis', photo: photos.patients[4], phone: '+91 98765 11005' },
  { id: 'p6', name: 'Kenji Sato', age: 19, gender: 'Male', blood: 'A-', lastVisit: '07 Aug 2026', condition: 'Check-up', photo: photos.patients[5], phone: '+91 98765 11006' },
  { id: 'p7', name: 'James Carter', age: 46, gender: 'Male', blood: 'B-', lastVisit: '16 Aug 2026', condition: 'Consultation', photo: photos.patients[6], phone: '+91 98765 11007' },
  { id: 'p8', name: 'Maya Iyer', age: 31, gender: 'Female', blood: 'O+', lastVisit: '15 Aug 2026', condition: 'Dermatology', photo: photos.patients[7], phone: '+91 98765 11008' },
];

export const previewAppointments = [
  { id: 'a1', patient: previewPatients[0], doctor: previewDoctors[0], type: 'Consultation', date: '16 Aug 2026', time: '09:30', status: 'Confirmed' },
  { id: 'a2', patient: previewPatients[1], doctor: previewDoctors[1], type: 'Follow-up', date: '16 Aug 2026', time: '10:15', status: 'Confirmed' },
  { id: 'a3', patient: previewPatients[2], doctor: previewDoctors[2], type: 'Pediatrics', date: '16 Aug 2026', time: '11:00', status: 'Confirmed' },
  { id: 'a4', patient: previewPatients[3], doctor: previewDoctors[3], type: 'Surgery', date: '16 Aug 2026', time: '13:30', status: 'In progress' },
  { id: 'a5', patient: previewPatients[4], doctor: previewDoctors[4], type: 'Telemedicine', date: '16 Aug 2026', time: '15:00', status: 'Confirmed' },
  { id: 'a6', patient: previewPatients[5], doctor: previewDoctors[5], type: 'Check-up', date: '17 Aug 2026', time: '09:00', status: 'Confirmed' },
  { id: 'a7', patient: previewPatients[6], doctor: previewDoctors[0], type: 'Consultation', date: '16 Aug 2026', time: '16:20', status: 'Confirmed' },
];

export const previewDepartments = [
  { id: 'dep1', name: 'Cardiology', doctors: 12, patients: 240, rooms: 8, photo: photos.departments[0], lead: previewDoctors[0] },
  { id: 'dep2', name: 'Neurology', doctors: 8, patients: 160, rooms: 6, photo: photos.departments[1], lead: previewDoctors[1] },
  { id: 'dep3', name: 'Pediatrics', doctors: 10, patients: 210, rooms: 7, photo: photos.departments[2], lead: previewDoctors[2] },
  { id: 'dep4', name: 'Orthopedics', doctors: 9, patients: 180, rooms: 5, photo: photos.departments[3], lead: previewDoctors[3] },
  { id: 'dep5', name: 'Dermatology', doctors: 6, patients: 132, rooms: 4, photo: photos.departments[4], lead: previewDoctors[4] },
  { id: 'dep6', name: 'Laboratory', doctors: 7, patients: 90, rooms: 3, photo: photos.departments[5], lead: previewDoctors[5] },
];

export const previewInventory = [
  { id: 'i1', name: 'Surgical gloves', sku: 'INV-1024', stock: 420, max: 500, unit: 'boxes', status: 'Available', category: 'PPE', expiry: '12 Mar 2027', photo: photos.supplies[0] },
  { id: 'i2', name: 'IV saline 500ml', sku: 'INV-2041', stock: 86, max: 200, unit: 'packs', status: 'Low stock', category: 'Fluids', expiry: '04 Nov 2026', photo: photos.supplies[1] },
  { id: 'i3', name: 'Digital thermometer', sku: 'INV-3302', stock: 54, max: 80, unit: 'pcs', status: 'Available', category: 'Devices', expiry: '18 Jan 2028', photo: photos.supplies[2] },
  { id: 'i4', name: 'N95 masks', sku: 'INV-4410', stock: 12, max: 180, unit: 'boxes', status: 'Critical', category: 'PPE', expiry: '22 Sep 2026', photo: photos.supplies[3] },
  { id: 'i5', name: 'Amoxicillin 500mg', sku: 'INV-5518', stock: 210, max: 300, unit: 'packs', status: 'Available', category: 'Pharmacy', expiry: '02 Feb 2027', photo: photos.supplies[4] },
  { id: 'i6', name: 'Alcohol swabs', sku: 'INV-6620', stock: 38, max: 120, unit: 'boxes', status: 'Low stock', category: 'Consumables', expiry: '30 Oct 2026', photo: photos.supplies[5] },
];

export const previewMessages = [
  { id: 'm1', name: previewDoctors[0].name, photo: previewDoctors[0].photo, preview: 'Please review the ECG for Aisha Rahman.', time: '09:12', unread: 2 },
  { id: 'm2', name: previewDoctors[2].name, photo: previewDoctors[2].photo, preview: 'Pediatrics ward is ready for rounds.', time: '08:44', unread: 0 },
  { id: 'm3', name: previewPatients[1].name, photo: previewPatients[1].photo, preview: 'Can I reschedule tomorrow’s visit?', time: 'Yesterday', unread: 1 },
  { id: 'm4', name: previewDoctors[4].name, photo: previewDoctors[4].photo, preview: 'Derm clinic inventory is low on swabs.', time: 'Yesterday', unread: 0 },
];

export const previewReports = [
  { id: 'r1', name: 'Monthly patient census', date: '12 Aug 2026', type: 'PDF' },
  { id: 'r2', name: 'Department occupancy', date: '10 Aug 2026', type: 'XLS' },
  { id: 'r3', name: 'Pharmacy stock audit', date: '08 Aug 2026', type: 'PDF' },
  { id: 'r4', name: 'Appointment no-show rate', date: '04 Aug 2026', type: 'CSV' },
];

export const previewActivity = [
  { id: 'act1', name: 'Aisha Rahman', action: 'Checked in for cardiology consult', time: '09:12', photo: photos.patients[0] },
  { id: 'act2', name: 'Dr. Noah Patel', action: 'Updated neurology notes', time: '09:04', photo: photos.doctors[1] },
  { id: 'act3', name: 'Priya Nair', action: 'Lab results uploaded', time: '08:41', photo: photos.patients[2] },
  { id: 'act4', name: 'Clinic pharmacy', action: 'N95 masks marked low stock', time: '08:18', photo: photos.supplies[3] },
];

export const ageGroups = [
  { label: '0–18', male: 22, female: 18 },
  { label: '19–35', male: 36, female: 42 },
  { label: '36–50', male: 28, female: 31 },
  { label: '51–65', male: 24, female: 20 },
  { label: '65+', male: 16, female: 19 },
];

export const departmentSlices = [
  { label: 'Cardiology', value: 28, color: '#4FA0AB' },
  { label: 'Pediatrics', value: 22, color: '#7BB8C0' },
  { label: 'Orthopedics', value: 18, color: '#F4A261' },
  { label: 'Neurology', value: 16, color: '#5B8DEF' },
  { label: 'Other', value: 16, color: '#9B87F5' },
];

export const revenueSeries = {
  thisYear: [42, 48, 45, 62, 58, 74, 70, 82, 76, 90, 84, 96],
  lastYear: [30, 34, 38, 44, 40, 52, 48, 60, 58, 66, 62, 70],
};

export const inventoryWeekly = [28, 36, 24, 42, 38, 48, 32];

export const inventoryCategories = [
  { label: 'PPE', value: 34 },
  { label: 'Pharmacy', value: 26 },
  { label: 'Fluids', value: 18 },
  { label: 'Devices', value: 12 },
  { label: 'Other', value: 10 },
];

export const calendarCategories = [
  { label: 'Consultation', color: '#4FA0AB' },
  { label: 'Follow-up', color: '#5B8DEF' },
  { label: 'Surgery', color: '#E76F51' },
  { label: 'Telemedicine', color: '#9B87F5' },
];

export const previewCalendarEvents = [
  { day: 3, title: 'Ward rounds', category: 'Consultation', color: '#4FA0AB', time: '08:30' },
  { day: 7, title: 'Follow-up clinic', category: 'Follow-up', color: '#5B8DEF', time: '11:00' },
  { day: 12, title: 'Ortho surgery', category: 'Surgery', color: '#E76F51', time: '13:00' },
  { day: 16, title: 'Aisha Rahman', category: 'Consultation', color: '#4FA0AB', time: '09:30' },
  { day: 16, title: 'Daniel Brooks', category: 'Follow-up', color: '#5B8DEF', time: '10:15' },
  { day: 16, title: 'Omar Haddad', category: 'Surgery', color: '#E76F51', time: '13:30' },
  { day: 17, title: 'Kenji Sato', category: 'Consultation', color: '#4FA0AB', time: '09:00' },
  { day: 21, title: 'Tele-derm', category: 'Telemedicine', color: '#9B87F5', time: '15:00' },
  { day: 25, title: 'Peds clinic', category: 'Consultation', color: '#4FA0AB', time: '10:00' },
];

export const surveyPoints = [42, 55, 48, 70, 64, 82, 76, 90, 84, 96, 88, 102];
export const kpis = {
  visitors: { value: '2,846', trend: '+12.4%' },
  patients: { value: '1,248', trend: '+8.1%' },
  appointments: { value: '186', trend: '+4.6%' },
};
