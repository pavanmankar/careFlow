import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';
import {
  privacyPolicyMeta,
  privacyPolicySections,
  privacyPolicyTitle,
} from '@/content/legal/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy | CareFlow',
  description:
    'How CareFlow collects, uses, and protects personal and health information, including HIPAA and DPDP-aligned practices.',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={privacyPolicyTitle}
      version={privacyPolicyMeta.version}
      effectiveDate={privacyPolicyMeta.effectiveDate}
      sections={privacyPolicySections}
    />
  );
}
