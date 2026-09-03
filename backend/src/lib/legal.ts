export const PRIVACY_POLICY_VERSION = '2026-09-01';
export const TERMS_VERSION = '2026-09-01';

export const LEGAL_DOCUMENT_TYPES = {
  TERMS_OF_SERVICE: 'TERMS_OF_SERVICE',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
} as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[keyof typeof LEGAL_DOCUMENT_TYPES];

export const CURRENT_LEGAL_VERSIONS: Record<LegalDocumentType, string> = {
  [LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE]: TERMS_VERSION,
  [LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY]: PRIVACY_POLICY_VERSION,
};

export function assertCurrentLegalVersions(input: { termsVersion: string; privacyVersion: string }) {
  if (input.termsVersion !== CURRENT_LEGAL_VERSIONS.TERMS_OF_SERVICE) {
    return 'Terms of Service have been updated. Please review and accept the latest version.';
  }
  if (input.privacyVersion !== CURRENT_LEGAL_VERSIONS.PRIVACY_POLICY) {
    return 'Privacy Policy has been updated. Please review and accept the latest version.';
  }
  return null;
}
