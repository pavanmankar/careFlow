export interface AuthUser {
  userId: string;
  tenantId: string | null;
  email: string;
  roles: string[];
  permissions: string[];
}

export const REFRESH_COOKIE = 'refresh_token';
