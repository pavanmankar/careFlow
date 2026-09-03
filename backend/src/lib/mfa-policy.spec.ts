jest.mock('@/lib/mfa-settings', () => ({
  getMfaAuthenticationEnabled: jest.fn(),
}));

jest.mock('@/db/client', () => ({
  db: {
    query: {
      tenants: {
        findFirst: jest.fn(),
      },
    },
  },
}));

import { getMfaAuthenticationEnabled } from '@/lib/mfa-settings';
import { db } from '@/db/client';
import { isMfaExempt, isTenantMfaRequired, requiresMfa } from '@/lib/mfa-policy';

describe('mfa-policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exempts super admin accounts', () => {
    expect(isMfaExempt(null)).toBe(true);
    expect(isMfaExempt('tenant-1')).toBe(false);
  });

  it('requires MFA for tenant users when platform MFA is enabled and clinic has not opted out', async () => {
    (getMfaAuthenticationEnabled as jest.Mock).mockResolvedValue(true);
    (db.query.tenants.findFirst as jest.Mock).mockResolvedValue({ mfaAuthenticationEnabled: null });
    await expect(isTenantMfaRequired('tenant-1')).resolves.toBe(true);
    await expect(requiresMfa('tenant-1')).resolves.toBe(true);
  });

  it('skips MFA when platform MFA is disabled', async () => {
    (getMfaAuthenticationEnabled as jest.Mock).mockResolvedValue(false);
    await expect(isTenantMfaRequired('tenant-1')).resolves.toBe(false);
    await expect(requiresMfa('tenant-1')).resolves.toBe(false);
  });

  it('skips MFA when clinic opted out', async () => {
    (getMfaAuthenticationEnabled as jest.Mock).mockResolvedValue(true);
    (db.query.tenants.findFirst as jest.Mock).mockResolvedValue({ mfaAuthenticationEnabled: false });
    await expect(isTenantMfaRequired('tenant-1')).resolves.toBe(false);
  });

  it('never requires MFA for super admin', async () => {
    (getMfaAuthenticationEnabled as jest.Mock).mockResolvedValue(true);
    await expect(requiresMfa(null)).resolves.toBe(false);
  });
});
