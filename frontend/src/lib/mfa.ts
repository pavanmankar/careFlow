export type MfaLoginResponse =
  | { accessToken: string }
  | { mfaEnrollmentRequired: true; enrollToken: string }
  | { mfaRequired: true; mfaToken: string };

export function isMfaEnrollmentResponse(
  data: MfaLoginResponse,
): data is { mfaEnrollmentRequired: true; enrollToken: string } {
  return 'mfaEnrollmentRequired' in data && data.mfaEnrollmentRequired === true;
}

export function isMfaVerifyResponse(data: MfaLoginResponse): data is { mfaRequired: true; mfaToken: string } {
  return 'mfaRequired' in data && data.mfaRequired === true;
}

export function isFullSessionResponse(data: MfaLoginResponse): data is { accessToken: string } {
  return 'accessToken' in data && typeof data.accessToken === 'string';
}
