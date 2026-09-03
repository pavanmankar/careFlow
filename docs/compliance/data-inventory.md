# Data inventory — PHI and PII

This document lists personal and health-related data stored by CareFlow as of the schema in [`backend/src/db/schema.ts`](../../backend/src/db/schema.ts).

**Legend**

| Sensitivity | Meaning |
|-------------|---------|
| **PHI** | Protected health information — clinical or health-related |
| **PII** | Personally identifiable information (non-clinical identifiers) |
| **Auth** | Authentication credential (hashed) |
| **Ops** | Operational metadata; must not contain clinical content |

**Encryption today:** Passwords and refresh tokens are hashed. All other fields below are **plaintext in MySQL** unless noted.

---

## Summary by entity

| Entity | Primary sensitivity | Tenant scoped | Branch scoped | Soft delete |
|--------|---------------------|---------------|---------------|-------------|
| `patients` | PHI + PII | Yes | Yes (`locationId`) | Yes |
| `appointments` | PHI | Yes | Yes | Yes |
| `appointment_vitals` | PHI | Yes | Via appointment | Yes |
| `appointment_procedures` | PHI | Yes | Via appointment | Yes |
| `appointment_medicines` | PHI | Yes | Via appointment | Yes |
| `appointment_documents` | PHI (metadata) | Yes | Via appointment | Yes |
| `appointment_charges` | Financial (low PHI link) | Yes | Via appointment | Yes |
| `users` | PII + Auth | Yes (nullable for super-admin) | Via roles | Yes |
| `businesses` / `locations` | PII (clinic contact) | Yes | N/A | Yes |
| `audit_logs` | Ops (no clinical text) | Optional | No | No |
| `refresh_tokens` | Auth | Per user | No | Revocable |

---

## `patients`

| Column | Type | Sensitivity | Notes |
|--------|------|-------------|-------|
| `id` | UUID | Ops | Internal identifier |
| `tenantId` | UUID | Ops | Isolation key |
| `locationId` | UUID | Ops | Branch scope |
| `firstName` | string | PII | |
| `lastName` | string | PII | |
| `phone` | string | PII | Unique per tenant + branch |
| `gender` | string | PHI | |
| `bloodGroup` | string | PHI | |
| `dateOfBirth` | date | PHI | |
| `lastVisitAt` | timestamp | Ops | |
| `emergencyContactName` | string | PII | |
| `emergencyContactPhone` | string | PII | |
| `allergies` | text | PHI | Clinical |
| `chronicConditions` | text | PHI | Clinical |
| `currentMedicines` | text | PHI | Clinical |
| `createdAt` / `updatedAt` | timestamp | Ops | |
| `createdBy` / `updatedBy` | UUID | Ops | Staff user id |
| `deletedAt` | timestamp | Ops | Soft delete |

**API:** `GET/POST` via [`patients.routes.ts`](../../backend/src/modules/patients/patients.routes.ts). Single-record view is audited; list is not (gap — Phase 3).

---

## `appointments`

| Column | Type | Sensitivity | Notes |
|--------|------|-------------|-------|
| `id` | UUID | Ops | |
| `tenantId` / `locationId` | UUID | Ops | |
| `patientId` | UUID | Ops | Links to PHI |
| `doctorUserId` | UUID | Ops | |
| `type` / `status` | string | Ops | |
| `startsAt` / `endsAt` | timestamp | Ops | Scheduling |
| `reasonForVisit` | text | PHI | |
| `pastHistory` | text | PHI | |
| `habits` | text | PHI | |
| `internalNote` | text | PHI | Staff-only clinical note |
| `cancelReason` | string | Low | May contain health context |
| `checkedInAt` / `startedAt` / `completedAt` | timestamp | Ops | |
| `taxPercent` | int | Financial | |

**API:** [`appointments.routes.ts`](../../backend/src/modules/appointments/appointments.routes.ts) — create, view, update, check-in, complete, cancel, reschedule audited.

---

## `appointment_vitals`

| Column | Sensitivity |
|--------|-------------|
| `bpSystolic`, `bpDiastolic`, `pulse`, `temperature`, `spo2`, `weightKg`, `heightCm`, `bmi` | PHI |
| `recordedAt` | Ops |

One row per appointment (unique on `appointmentId`).

---

## `appointment_procedures`

| Column | Sensitivity |
|--------|-------------|
| `examination` | PHI |
| `treatment` | PHI |

---

## `appointment_medicines`

| Column | Sensitivity |
|--------|-------------|
| `medicine`, `dose`, `frequency`, `duration`, `instructions` | PHI |

Multiple rows per appointment.

---

## `appointment_documents`

| Column | Sensitivity | Notes |
|--------|-------------|-------|
| `fileName` | PHI metadata | May reveal procedure type |
| `kind` | Ops | Consent, X-ray, Photo |
| `url` | PHI metadata | External URL; file not stored in app yet |

---

## `appointment_charges`

| Column | Sensitivity |
|--------|-------------|
| `chargeFor`, `amount`, `tax`, `amountWithTax` | Financial (linked to visit) |

---

## `users` (staff and clinic owners)

| Column | Sensitivity | Notes |
|--------|-------------|-------|
| `firstName`, `lastName` | PII | |
| `email` | PII | Globally unique |
| `phone` | PII | Optional |
| `passwordHash` | Auth | Argon2 |
| `address` | PII | JSON |
| `avatar` | PII | URL |
| `timezone` | Ops | |
| `status`, `lastLoginAt` | Ops | |

Platform `SUPER_ADMIN` users have `tenantId` null.

---

## `businesses` and `locations`

Clinic-identifying and contact data (PII): `name`, `legalName`, `email`, `phone`, `address`, `website`, `logo`.

Not patient PHI but subject to DPDP as business personal data where applicable.

---

## `audit_logs`

| Column | Stored content |
|--------|----------------|
| `action` | e.g. `PATIENT_VIEW`, `LOGIN`, `APPOINTMENT_CREATE` |
| `resource` / `resourceId` | Resource type and id only |
| `actorId`, `tenantId` | Who and which clinic |
| `ip`, `userAgent` | Request metadata (clipped) |

**Must not store:** passwords, clinical notes, patient names, or other PHI (enforced by convention in [`audit.ts`](../../backend/src/lib/audit.ts)).

---

## `refresh_tokens`

| Column | Notes |
|--------|-------|
| `tokenHash` | SHA-256 of refresh token |
| `userId`, `expiresAt`, `revokedAt` | Session management |

---

## Data not stored in CareFlow today

- Payment card data
- Full uploaded file bytes (only document URL metadata)
- Email/SMS message content
- Google Calendar tokens
- Patient portal accounts

---

## Data flows outside the database

| Flow | Data | Risk |
|------|------|------|
| Browser ↔ API | JWT access token, JSON API bodies (PHI in responses) | TLS required in prod |
| API ↔ MySQL | Full row data | TLS depends on `DATABASE_URL` SSL config |
| Server logs | Errors via `console.error` | May leak internals — Phase 1 redaction |
| Public demo | Synthetic seed data only | Must not load production exports |

---

## Phase 4 encryption targets (planned)

Application-level encryption planned for clinical **text** fields:

- `patients`: `allergies`, `chronicConditions`, `currentMedicines`, emergency contacts
- `appointments`: `reasonForVisit`, `pastHistory`, `habits`, `internalNote`
- `appointment_procedures`: `examination`, `treatment`
- `appointment_medicines`: `instructions`

Searchable fields (`firstName`, `lastName`, `phone`) require a separate design (blind index or accepted plaintext) — documented in Phase 4.

---

## Maintenance

Update this file when:

- New tables or columns are added to [`schema.ts`](../../backend/src/db/schema.ts)
- New API endpoints return PHI
- File upload or third-party integrations store data elsewhere
