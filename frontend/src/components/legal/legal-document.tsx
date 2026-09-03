import type { LegalSection } from '@/content/legal/legal-meta';
import { LegalDocumentLink } from '@/components/legal/legal-document-link';

type LegalDocumentProps = {
  title: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
  variant?: 'page' | 'modal';
};

export function LegalDocument({ title, version, effectiveDate, sections, variant = 'page' }: LegalDocumentProps) {
  const isModal = variant === 'modal';

  return (
    <article className={isModal ? 'text-left' : 'mx-auto max-w-3xl text-left'}>
      {!isModal ? (
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Legal</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">
            Version {version} · Effective {effectiveDate}
          </p>
        </header>
      ) : null}

      <div
        className={
          isModal
            ? 'mb-6 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-left text-[13px] leading-6 text-amber-950'
            : 'mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
        }
      >
        This document is provided for transparency and compliance planning. It is not legal advice. Consult
        qualified counsel before processing real protected health information in production.
      </div>

      {!isModal ? (
        <nav className="mb-10 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Table of contents">
          <h2 className="text-sm font-semibold text-navy-900">Contents</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-brand-700">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="hover:underline">
                  {section.title.replace(/^\d+\.\s*/, '')}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className={isModal ? 'space-y-8' : 'space-y-10'}>
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={isModal ? 'scroll-mt-6 border-b border-slate-100 pb-8 last:border-b-0 last:pb-0' : 'scroll-mt-24'}
          >
            <h2 className={isModal ? 'text-base font-semibold text-navy-900' : 'text-lg font-semibold text-navy-900'}>
              {section.title}
            </h2>
            <div
              className={
                isModal
                  ? 'mt-3 space-y-3 text-left text-[13px] leading-7 text-slate-600'
                  : 'mt-3 space-y-3 text-sm leading-7 text-slate-600'
              }
            >
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!isModal ? (
        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>
            Questions? See our{' '}
            <LegalDocumentLink document="privacy">Privacy Policy</LegalDocumentLink> or{' '}
            <LegalDocumentLink document="terms">Terms of Service</LegalDocumentLink>.
          </p>
        </footer>
      ) : null}
    </article>
  );
}
