process.env.PHI_ENCRYPTION_KEY =
  'careflow_local_phi_key_4e8b1c9d3f7a0e5b2c6d0f4a8e1b5c9d3f7a0e4b8c2d6f1a5e9b3c7f1a4e8b2c6d0f4';

import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';

describe('secret-crypto', () => {
  it('round-trips encrypted secrets', () => {
    const plaintext = 'CAREFLOWDEMOSECRET1';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });
});
