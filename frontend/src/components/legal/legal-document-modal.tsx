'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LegalDocument } from '@/components/legal/legal-document';
import { Button } from '@/components/ui/button';
import {
  privacyPolicyMeta,
  privacyPolicySections,
  privacyPolicyTitle,
} from '@/content/legal/privacy-policy';
import {
  termsOfServiceMeta,
  termsOfServiceSections,
  termsOfServiceTitle,
} from '@/content/legal/terms-of-service';

export type LegalDocumentKind = 'privacy' | 'terms';

const LEGAL_DOCUMENTS = {
  privacy: {
    title: privacyPolicyTitle,
    version: privacyPolicyMeta.version,
    effectiveDate: privacyPolicyMeta.effectiveDate,
    sections: privacyPolicySections,
  },
  terms: {
    title: termsOfServiceTitle,
    version: termsOfServiceMeta.version,
    effectiveDate: termsOfServiceMeta.effectiveDate,
    sections: termsOfServiceSections,
  },
} as const;

type LegalDocumentModalProps = {
  kind: LegalDocumentKind;
  open: boolean;
  onClose: () => void;
};

export function LegalDocumentModal({ kind, open, onClose }: LegalDocumentModalProps) {
  const content = LEGAL_DOCUMENTS[kind];

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl"
      >
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Legal</p>
              <h2 id="legal-modal-title" className="mt-1 text-xl font-semibold tracking-tight text-navy-900">
                {content.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Version {content.version} · Effective {content.effectiveDate}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]">
          <LegalDocument
            title={content.title}
            version={content.version}
            effectiveDate={content.effectiveDate}
            sections={content.sections}
            variant="modal"
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button type="button" variant="secondary" className="min-w-[120px] rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
