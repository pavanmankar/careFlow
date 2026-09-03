export type LegalConsentStatus = {
  required: boolean;
  satisfied: boolean;
  termsVersion: string;
  privacyVersion: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export function needsLegalAcceptance(legal?: LegalConsentStatus | null) {
  return Boolean(legal?.required && !legal.satisfied);
}
