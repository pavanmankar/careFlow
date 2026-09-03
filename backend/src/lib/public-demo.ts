export const PUBLIC_DEMO_EMAIL = 'demo@careflow.in';
export const PUBLIC_DEMO_MFA_SECRET = 'CAREFLOWDEMOSECRET1';
export const PUBLIC_DEMO_TENANT_ID = '01HQCFPUB0000000000000001';
export const DEMO_VIEWER_ROLE_CODE = 'DEMO_VIEWER';

export function isDemoViewerRole(roles: string[]) {
  return roles.includes(DEMO_VIEWER_ROLE_CODE);
}

export function isPublicDemoTenant(tenantId: string | null | undefined) {
  return tenantId === PUBLIC_DEMO_TENANT_ID;
}

export function bypassesSubscriptionCheck(tenantId: string | null | undefined, roles: string[]) {
  return isPublicDemoTenant(tenantId) || isDemoViewerRole(roles);
}
