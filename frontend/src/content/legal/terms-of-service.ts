import type { LegalSection } from './legal-meta';
import {
  LEGAL_EMAIL,
  LEGAL_ENTITY_NAME,
  PRIVACY_POLICY_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_VERSION,
} from './legal-meta';

export const termsOfServiceTitle = 'Terms of Service';

export const termsOfServiceMeta = {
  version: TERMS_VERSION,
  effectiveDate: TERMS_EFFECTIVE_DATE,
};

export const termsOfServiceSections: LegalSection[] = [
  {
    id: 'agreement',
    title: '1. Agreement to terms',
    paragraphs: [
      `These Terms of Service ("Terms") govern access to and use of the CareFlow platform and related services (the "Service") operated by ${LEGAL_ENTITY_NAME} ("CareFlow", "we", "us", or "our"). By creating an account or using the Service, you agree to these Terms and our Privacy Policy (version ${PRIVACY_POLICY_VERSION}).`,
      'If you use the Service on behalf of a clinic or organization, you represent that you have authority to bind that organization. These Terms are a compliance-oriented template and do not constitute legal advice.',
    ],
  },
  {
    id: 'service',
    title: '2. The Service',
    paragraphs: [
      'CareFlow provides tools for clinic operations including patient records, appointments, clinical visit documentation, inventory, staff and role management, and related features as described on our website.',
      'We may modify, suspend, or discontinue features with reasonable notice where practicable. Beta or demo features may be provided "as is" without warranties.',
    ],
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and registration',
    paragraphs: [
      'You must be at least 18 years old and authorized to register a clinic or business account. You agree to provide accurate registration information and keep it current.',
      'You are responsible for all activity under your account. You must accept the then-current Terms and Privacy Policy at registration; we record the version you accepted for audit purposes.',
    ],
  },
  {
    id: 'clinic-obligations',
    title: '4. Clinic obligations',
    paragraphs: [
      'You are responsible for compliance with healthcare, privacy, and data protection laws applicable to your practice, including HIPAA (if you are a U.S. covered entity or business associate) and India\'s DPDP Act (for personal data of individuals in India).',
      'You must obtain all required patient authorizations and notices, including any Notice of Privacy Practices required under HIPAA. CareFlow does not provide patient-facing NPP on your behalf.',
      'You must configure roles and permissions using the minimum necessary principle, train your workforce, and ensure only authorized staff access PHI.',
      'You must not enter real patient PHI into demo, trial, or sandbox environments unless explicitly permitted in writing.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable use',
    paragraphs: [
      'You agree not to: violate law or third-party rights; upload malware or attempt unauthorized access; probe or scan systems without permission; interfere with the Service; misrepresent identity; harvest data from the Service; or use the Service for unlawful discrimination or harassment.',
      'We may suspend or terminate access for violations, security risks, or non-payment, subject to applicable law and notice where required.',
    ],
  },
  {
    id: 'phi-baa',
    title: '6. PHI and Business Associate Agreement',
    paragraphs: [
      'If you are a covered entity or business associate under HIPAA and will store or transmit PHI through the Service in production, you must execute a Business Associate Agreement (BAA) with CareFlow before doing so.',
      'Until a BAA is in place, you agree not to use the Service for PHI beyond what is permitted for evaluation with synthetic or de-identified data.',
      'You remain the controller of patient data. CareFlow processes PHI only to provide the Service as instructed by you and as described in the BAA and Privacy Policy.',
    ],
  },
  {
    id: 'security',
    title: '7. Security responsibilities',
    paragraphs: [
      'You must use strong passwords, enable multi-factor authentication when offered or required, protect devices used to access the Service, and promptly notify us of suspected compromise.',
      'CareFlow implements platform security controls as described in the Privacy Policy. You are responsible for endpoint security, physical access to devices, and staff adherence to your policies.',
    ],
  },
  {
    id: 'ip',
    title: '8. Intellectual property',
    paragraphs: [
      'CareFlow and its licensors retain all rights in the Service, software, branding, and documentation. You receive a limited, non-exclusive, non-transferable license to use the Service during your subscription or account term.',
      'You retain ownership of data you submit. You grant CareFlow a license to host, process, and display your data solely to provide and improve the Service.',
    ],
  },
  {
    id: 'confidentiality',
    title: '9. Confidentiality',
    paragraphs: [
      'Each party will protect the other\'s confidential information with reasonable care and use it only for purposes of the relationship. This does not limit disclosure required by law or processing of data under the Privacy Policy.',
    ],
  },
  {
    id: 'availability',
    title: '10. Availability and support',
    paragraphs: [
      'We strive for reliable availability but do not guarantee uninterrupted access. Maintenance windows, third-party outages, and force majeure may affect the Service.',
      'Support channels and response times may vary by plan. Critical security issues should be reported promptly to our security contact.',
    ],
  },
  {
    id: 'fees',
    title: '11. Fees',
    paragraphs: [
      'Paid features, if any, are billed according to your order or subscription terms. Failure to pay may result in suspension. Taxes are your responsibility unless stated otherwise.',
    ],
  },
  {
    id: 'termination',
    title: '12. Termination',
    paragraphs: [
      'You may stop using the Service and request account closure. We may terminate or suspend for breach, risk, or legal requirement.',
      'Upon termination, your right to access the Service ends. Provisions that by nature should survive (including confidentiality, liability limits, and governing law) will survive.',
    ],
  },
  {
    id: 'disclaimers',
    title: '13. Disclaimers',
    paragraphs: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" TO THE MAXIMUM EXTENT PERMITTED BY LAW. CAREFLOW DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'CareFlow is not a medical device and does not provide medical advice. Clinical decisions remain solely with licensed providers.',
    ],
  },
  {
    id: 'liability',
    title: '14. Limitation of liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAREFLOW WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOST PROFITS OR DATA, ARISING FROM THE SERVICE.',
      'OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS PAID BY YOU TO CAREFLOW IN THE TWELVE (12) MONTHS BEFORE THE CLAIM, OR ONE HUNDRED U.S. DOLLARS IF NO FEES WERE PAID, WHICHEVER IS GREATER, EXCEPT WHERE LIABILITY CANNOT BE LIMITED BY LAW.',
    ],
  },
  {
    id: 'indemnity',
    title: '15. Indemnification',
    paragraphs: [
      'You will indemnify and hold CareFlow harmless from claims arising from your use of the Service, your data, your violation of these Terms or law, or your failure to obtain required patient consents or BAAs, except to the extent caused by our gross negligence or willful misconduct.',
    ],
  },
  {
    id: 'governing-law',
    title: '16. Governing law',
    paragraphs: [
      'These Terms are governed by the laws of India, without regard to conflict-of-law principles. Courts in Mumbai, Maharashtra shall have exclusive jurisdiction, subject to mandatory consumer protections in your jurisdiction.',
    ],
  },
  {
    id: 'changes',
    title: '17. Changes to terms',
    paragraphs: [
      `We may update these Terms. We will post the revised Terms with a new effective date and version (${TERMS_VERSION} is current). Material changes may require renewed acceptance at login or registration. Continued use after notice may constitute acceptance where permitted by law.`,
    ],
  },
  {
    id: 'contact',
    title: '18. Contact',
    paragraphs: [
      `Legal and contractual inquiries: ${LEGAL_EMAIL}`,
    ],
  },
];
