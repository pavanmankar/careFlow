import { hasPermissions } from './permissions';
import { ROLE_CODES } from '../shared/types';

describe('hasPermissions', () => {
  it('returns false when a required permission is missing', () => {
    expect(hasPermissions(['STAFF_READ'], ['STAFF_CREATE'])).toBe(false);
  });
});

describe('platform roles', () => {
  it('includes Super Admin, Owner, and Doctor as built-in roles', () => {
    expect(Object.values(ROLE_CODES)).toEqual([
      ROLE_CODES.SUPER_ADMIN,
      ROLE_CODES.TENANT_OWNER,
      ROLE_CODES.DOCTOR,
    ]);
  });
});
