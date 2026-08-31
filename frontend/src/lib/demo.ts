export const PUBLIC_DEMO = {
  email: 'demo@careflow.in',
  password: 'DemoViewer!234',
  clinicName: 'CareFlow Demo Clinic',
  roleCode: 'DEMO_VIEWER',
} as const;

const WRITE_PERMISSION_SUFFIXES = ['_CREATE', '_UPDATE', '_DELETE', '_ACTIVATE'] as const;
const WRITE_PERMISSION_CODES = ['ROLE_ASSIGN_PERMISSIONS', 'USER_ASSIGN_ROLE'] as const;

export function isDemoViewer(permissions: string[], roles: string[] = []) {
  if (roles.includes(PUBLIC_DEMO.roleCode)) {
    return true;
  }
  if (!permissions.length) {
    return false;
  }
  return !permissions.some(
    (code) =>
      WRITE_PERMISSION_SUFFIXES.some((suffix) => code.endsWith(suffix)) ||
      WRITE_PERMISSION_CODES.includes(code as (typeof WRITE_PERMISSION_CODES)[number]),
  );
}

export const E2E_DEMO = {
  clinicOwner: {
    email: 'anita.desai@sunriseclinic.in',
    password: 'SunriseClinic!234',
    name: 'Anita Desai',
  },
  superAdmin: {
    email: 'superadmin@gmail.com',
    password: 'PlatformAdmin!234',
  },
  pause: {
    intro: 6_000,
    scene: 20_000,
    dashboard: 35_000,
    visit: 40_000,
    calendar: 30_000,
    platform: 30_000,
    outro: 6_000,
  },
} as const;
