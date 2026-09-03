import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { ERROR_CODES } from '@/shared/types';

export type MfaTokenPurpose = 'mfa_enroll' | 'mfa_verify';

const PURPOSE_EXPIRY: Record<MfaTokenPurpose, string> = {
  mfa_enroll: '15m',
  mfa_verify: '5m',
};

export function signMfaToken(userId: string, purpose: MfaTokenPurpose): string {
  return jwt.sign({ sub: userId, purpose }, config.jwtSecret, {
    expiresIn: PURPOSE_EXPIRY[purpose] as jwt.SignOptions['expiresIn'],
  });
}

export function verifyMfaToken(token: string, expectedPurpose: MfaTokenPurpose): string {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string; purpose?: string };
    if (!payload.sub || payload.purpose !== expectedPurpose) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired MFA token.', 401);
    }
    return payload.sub;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired MFA token.', 401);
  }
}
