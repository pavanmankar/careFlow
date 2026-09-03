'use client';

import { LegalDocumentLink } from '@/components/legal/legal-document-link';

export function LandingLegalLinks() {
  return (
    <ul className="mt-4 space-y-2.5">
      <li>
        <LegalDocumentLink document="privacy" className="text-sm text-slate-400 transition hover:text-brand-200">
          Privacy Policy
        </LegalDocumentLink>
      </li>
      <li>
        <LegalDocumentLink document="terms" className="text-sm text-slate-400 transition hover:text-brand-200">
          Terms of Service
        </LegalDocumentLink>
      </li>
    </ul>
  );
}
