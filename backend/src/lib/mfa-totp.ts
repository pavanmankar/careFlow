import { generateSecret, generateSync, generateURI, verifySync } from 'otplib';

const ISSUER = 'CareFlow';
const EPOCH_TOLERANCE = 30;

export function createTotpSecret(): string {
  return generateSecret();
}

export function totpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const token = code.replace(/\s+/g, '');
  return verifySync({ secret, token, epochTolerance: EPOCH_TOLERANCE }).valid;
}

export function currentTotpToken(secret: string): string {
  return generateSync({ secret });
}
