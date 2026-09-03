import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';
import {
  termsOfServiceMeta,
  termsOfServiceSections,
  termsOfServiceTitle,
} from '@/content/legal/terms-of-service';

export const metadata: Metadata = {
  title: 'Terms of Service | CareFlow',
  description: 'Terms governing use of the CareFlow clinic management platform, including HIPAA-related obligations.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title={termsOfServiceTitle}
      version={termsOfServiceMeta.version}
      effectiveDate={termsOfServiceMeta.effectiveDate}
      sections={termsOfServiceSections}
    />
  );
}
