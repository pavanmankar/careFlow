'use client';

import { LegalDocumentLink } from '@/components/legal/legal-document-link';

export function LegalFooterLinks() {
  return (
    <p className="mt-6 text-center text-xs text-slate-400">
      <LegalDocumentLink document="privacy" className="font-normal text-slate-400 hover:text-slate-600">
        Privacy Policy
      </LegalDocumentLink>
      <span className="mx-2 text-slate-300" aria-hidden="true">
        ·
      </span>
      <LegalDocumentLink document="terms" className="font-normal text-slate-400 hover:text-slate-600">
        Terms of Service
      </LegalDocumentLink>
    </p>
  );
}
