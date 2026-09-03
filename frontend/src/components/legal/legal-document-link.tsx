'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/cn';
import { LegalDocumentModal, type LegalDocumentKind } from '@/components/legal/legal-document-modal';

type LegalDocumentLinkProps = {
  document: LegalDocumentKind;
  children: ReactNode;
  className?: string;
};

export function LegalDocumentLink({ document, children, className }: LegalDocumentLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn('inline font-medium text-brand-600 underline-offset-2 hover:underline', className)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <LegalDocumentModal kind={document} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
