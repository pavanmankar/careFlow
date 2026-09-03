import { ULID } from '@/lib/id';
import { utcNowMs } from '@/lib/time';
import { clipIp, clipUserAgent } from '@/lib/request-meta';
import { db } from '@/db/client';
import { userConsentRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  CURRENT_LEGAL_VERSIONS,
  LEGAL_DOCUMENT_TYPES,
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
  type LegalDocumentType,
} from '@/lib/legal';

export type LegalConsentStatus = {
  required: boolean;
  satisfied: boolean;
  termsVersion: string;
  privacyVersion: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export async function getLegalConsentStatus(userId: string): Promise<LegalConsentStatus> {
  const rows = await db
    .select({
      documentType: userConsentRecords.documentType,
      documentVersion: userConsentRecords.documentVersion,
    })
    .from(userConsentRecords)
    .where(eq(userConsentRecords.userId, userId));

  const termsAccepted = rows.some(
    (row) =>
      row.documentType === LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE &&
      row.documentVersion === CURRENT_LEGAL_VERSIONS.TERMS_OF_SERVICE,
  );
  const privacyAccepted = rows.some(
    (row) =>
      row.documentType === LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY &&
      row.documentVersion === CURRENT_LEGAL_VERSIONS.PRIVACY_POLICY,
  );

  return {
    required: true,
    satisfied: termsAccepted && privacyAccepted,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_POLICY_VERSION,
    termsAccepted,
    privacyAccepted,
  };
}

export async function recordLegalAcceptances(input: {
  userId: string;
  tenantId: string | null;
  termsVersion: string;
  privacyVersion: string;
  ip?: string;
  userAgent?: string;
}) {
  const acceptedAt = BigInt(utcNowMs());
  const ip = clipIp(input.ip);
  const userAgent = clipUserAgent(input.userAgent);
  const rows: Array<{
    documentType: LegalDocumentType;
    documentVersion: string;
  }> = [
    { documentType: LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE, documentVersion: input.termsVersion },
    { documentType: LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY, documentVersion: input.privacyVersion },
  ];

  await db.insert(userConsentRecords).values(
    rows.map((row) => ({
      id: ULID.random(),
      userId: input.userId,
      tenantId: input.tenantId,
      documentType: row.documentType,
      documentVersion: row.documentVersion,
      acceptedAt,
      ip,
      userAgent,
    })),
  );
}
