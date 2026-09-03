import type { LegalSection } from './legal-meta';
import {
  GRIEVANCE_OFFICER_EMAIL,
  LEGAL_EMAIL,
  LEGAL_ENTITY_NAME,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_EMAIL,
  PRIVACY_POLICY_VERSION,
} from './legal-meta';

export const privacyPolicyTitle = 'Privacy Policy';

export const privacyPolicyMeta = {
  version: PRIVACY_POLICY_VERSION,
  effectiveDate: PRIVACY_EFFECTIVE_DATE,
};

export const privacyPolicySections: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    paragraphs: [
      `${LEGAL_ENTITY_NAME} ("CareFlow", "we", "us", or "our") provides a cloud-based clinic management platform for healthcare organizations. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use our website, applications, and APIs (collectively, the "Service").`,
      'This policy applies to clinic owners, staff, and other users who access the Service. Patients whose records are stored in CareFlow by a clinic should contact that clinic directly for questions about their health information; the clinic is typically the data controller or fiduciary for patient data.',
      'This document is a compliance-oriented notice and does not constitute legal advice. Obtain qualified legal counsel before processing real protected health information (PHI) in production.',
    ],
  },
  {
    id: 'roles',
    title: '2. Roles and responsibilities',
    paragraphs: [
      'For patient and clinical data entered by a clinic into CareFlow, the clinic is generally the data controller (under India\'s Digital Personal Data Protection Act, 2023) or covered entity (under HIPAA, when applicable). CareFlow acts as a data processor or business associate, processing information on the clinic\'s instructions to provide the Service.',
      'CareFlow is responsible for the security of the platform and for processing data in accordance with our agreements with customers. Clinics remain responsible for obtaining lawful bases for processing patient data, providing required notices to patients, and configuring access in line with the minimum necessary standard.',
    ],
  },
  {
    id: 'information-we-collect',
    title: '3. Information we collect',
    paragraphs: [
      'Account and profile data: name, email address, phone number, role assignments, authentication credentials (stored as Argon2 password hashes), and optional profile settings.',
      'Clinic and business data: clinic name, business type, locations, addresses, contact details, timezone, currency, and operational settings.',
      'Patient and clinical data (processed on behalf of clinics): patient demographics, contact information, appointments, vitals, clinical notes, medicines, charges, allergies, chronic conditions, and related visit documentation.',
      'Technical and security data: IP address, user agent, session and audit events (such as login success or failure, registration, and permission-sensitive actions). We do not store clinical content in audit logs.',
      'Support communications: information you send when contacting us at the addresses listed in this policy.',
    ],
  },
  {
    id: 'how-we-use',
    title: '4. How we use information',
    paragraphs: [
      'We use personal information to provide, maintain, and improve the Service; authenticate users; enforce access controls; prevent fraud and abuse; comply with law; and respond to support requests.',
      'Lawful bases under applicable law may include performance of a contract (providing the Service you registered for), consent (where required), and legitimate interests in securing and operating the platform.',
      'We do not sell personal information. We do not use patient PHI for advertising or unrelated marketing.',
    ],
  },
  {
    id: 'hipaa',
    title: '5. HIPAA and protected health information',
    paragraphs: [
      'Where a U.S. covered entity or business associate uses CareFlow to create, receive, maintain, or transmit PHI, a Business Associate Agreement (BAA) is required before production use of PHI, in addition to these terms.',
      'CareFlow implements administrative, physical, and technical safeguards designed to support HIPAA-aligned security practices. Organizational policies, workforce training, and formal risk analysis remain the customer\'s responsibility as a covered entity.',
      'Clinics must not place real patient PHI in demo or sandbox environments. The public demo tenant is for synthetic data only.',
    ],
  },
  {
    id: 'security',
    title: '6. Security safeguards',
    paragraphs: [
      'We apply safeguards including: unique user identification; role-based access control and tenant/branch isolation; Argon2 password hashing; short-lived access tokens with httpOnly refresh cookies; optional TOTP multi-factor authentication; HTTPS for data in transit; client session timeout; and selective audit logging of security-relevant events.',
      'PHI and most PII are stored in our database. Field-level encryption at rest for clinical data is on our roadmap and may not yet be enabled in all environments. Database connection encryption depends on hosting configuration.',
      'No method of transmission or storage is completely secure. You are responsible for safeguarding your credentials and promptly reporting suspected unauthorized access.',
    ],
  },
  {
    id: 'retention',
    title: '7. Data retention',
    paragraphs: [
      'We retain account and clinic data for as long as your subscription or account is active and as needed to provide the Service, resolve disputes, enforce agreements, and comply with legal obligations.',
      'Upon termination, data may be deleted or anonymized according to our data retention procedures and applicable law. Clinics should export records they are required to retain before closing an account.',
    ],
  },
  {
    id: 'disclosure',
    title: '8. Disclosure and subprocessors',
    paragraphs: [
      'We may disclose information to infrastructure providers that host or support the Service (such as cloud hosting, database, and deployment platforms), subject to contractual confidentiality and security obligations.',
      'Some subprocessors may process data in jurisdictions outside India, including the United States. Where required, we rely on appropriate contractual safeguards. A current list of subprocessors is maintained in our internal vendor documentation and available on request.',
      'We may also disclose information when required by law, to protect rights and safety, or in connection with a merger or acquisition with appropriate notice where practicable.',
    ],
  },
  {
    id: 'cross-border',
    title: '9. Cross-border transfers',
    paragraphs: [
      'CareFlow is designed for clinics operating in India by default but may be hosted on infrastructure located outside India. By using the Service, you acknowledge that data may be transferred to and processed in countries that may have different data protection laws than your jurisdiction.',
      'We take steps designed to ensure an adequate level of protection for transferred data consistent with applicable requirements.',
    ],
  },
  {
    id: 'your-rights',
    title: '10. Your rights',
    paragraphs: [
      'Depending on applicable law, you may have rights to access, correct, delete, or restrict processing of your personal information, to withdraw consent where processing is consent-based, and to lodge a complaint with a supervisory authority.',
      'Under India\'s DPDP Act, data principals may contact our grievance officer regarding processing of their personal data. For patient health records, requests should generally be directed to the clinic that holds the record; we will assist our customers in fulfilling such requests where contractually required.',
      `To exercise rights relating to your CareFlow account, contact ${PRIVACY_EMAIL}. We may verify your identity before responding.`,
    ],
  },
  {
    id: 'grievance',
    title: '11. Grievance officer (India)',
    paragraphs: [
      `For grievances related to personal data processing under applicable Indian law, contact our grievance officer at ${GRIEVANCE_OFFICER_EMAIL}. We will acknowledge and address grievances in accordance with applicable timelines.`,
    ],
  },
  {
    id: 'breach',
    title: '12. Security incidents and breach notification',
    paragraphs: [
      'We maintain procedures to detect, respond to, and mitigate security incidents. If we become aware of a breach affecting personal data, we will notify affected customers and regulators as required by applicable law, including HIPAA breach notification rules for covered entities and DPDP requirements where applicable.',
      'Clinics must notify CareFlow promptly if they suspect unauthorized access to the Service or misuse of credentials.',
    ],
  },
  {
    id: 'children',
    title: '13. Children\'s data',
    paragraphs: [
      'The Service is intended for use by clinic staff and authorized users, not directly by children. Pediatric patient records may be stored by clinics in the course of care. Clinics are responsible for obtaining appropriate consent or authorization for minors\' data under applicable law.',
    ],
  },
  {
    id: 'changes',
    title: '14. Changes to this policy',
    paragraphs: [
      `We may update this Privacy Policy from time to time. The "Effective date" and version identifier at the top of this page will change when we do. Material changes will be communicated through the Service or by email where appropriate. Continued use after changes constitutes acceptance of the updated policy, subject to applicable law.`,
      `Current version: ${PRIVACY_POLICY_VERSION}.`,
    ],
  },
  {
    id: 'contact',
    title: '15. Contact us',
    paragraphs: [
      `Privacy inquiries: ${PRIVACY_EMAIL}`,
      `Legal inquiries: ${LEGAL_EMAIL}`,
    ],
  },
];
