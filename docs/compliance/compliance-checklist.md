# Compliance checklist

Track implementation status for **HIPAA Security Rule** (technical/administrative safeguards) and **India DPDP Act 2023** (key obligations). Status values:

| Status | Meaning |
|--------|---------|
| **Done** | Implemented and verified |
| **Partial** | Some controls exist; gaps remain |
| **Planned** | Scheduled in roadmap phase |
| **Not started** | No implementation |
| **N/A** | Not applicable to current scope |
| **Org** | Organizational / legal — not code |

Last updated: Phase 5 partial (legal pages and registration consent).

---

## HIPAA — Administrative safeguards

| ID | Control | Status | Phase | Notes |
|----|---------|--------|-------|-------|
| A1 | Security management process (risk analysis) | Org | 6 | Template in Phase 6 |
| A2 | Assigned security responsibility | Org | 0 | Owner TBD in [README.md](./README.md) |
| A3 | Workforce security (access authorization) | Partial | — | RBAC exists; no formal HR process |
| A4 | Information access management (minimum necessary) | Partial | — | Permissions coarse; no `PATIENT_WRITE` split |
| A5 | Security awareness training | Org | 6 | |
| A6 | Security incident procedures | Not started | 5–6 | Incident table Phase 5; runbook Phase 6 |
| A7 | Contingency plan (backup, DR) | Not started | 8 | |
| A8 | Evaluation (periodic security review) | Not started | 9 | |
| A9 | Business associate agreements | Org | 0–6 | [vendor-subprocessors.md](./vendor-subprocessors.md) |

---

## HIPAA — Physical safeguards

| ID | Control | Status | Phase | Notes |
|----|---------|--------|-------|-------|
| P1 | Facility access controls | N/A | — | Cloud-hosted; vendor responsibility |
| P2 | Workstation use / security | Org | 6 | Policy for staff devices |
| P3 | Device and media controls | N/A | — | No local PHI media in product |

---

## HIPAA — Technical safeguards

| ID | Control | Status | Phase | Notes |
|----|---------|--------|-------|-------|
| T1 | Access control — unique user ID | Done | — | JWT `userId` per user |
| T2 | Access control — emergency access | Not started | — | No break-glass procedure |
| T3 | Access control — automatic logoff | Partial | — | 15 min client idle timeout; JWT 15m |
| T4 | Access control — encryption and decryption | Not started | 4 | PHI plaintext in MySQL |
| T5 | Audit controls | Partial | 3 | Partial events; no list-read audit; no viewer |
| T6 | Integrity controls | Partial | — | Soft deletes; no tamper-proof audit |
| T7 | Person or entity authentication | Done | 2 | Password + JWT + TOTP MFA (platform toggle) |
| T8 | Transmission security | Partial | 1 | HTTPS at edge; DB TLS weak (`rejectUnauthorized: false`) |

---

## HIPAA — Organizational / policies

| ID | Control | Status | Phase | Notes |
|----|---------|--------|-------|-------|
| O1 | Privacy policies published | Partial | 5 | `/privacy` and `/terms` published; counsel review pending |
| O2 | Notice of privacy practices | N/A | — | Patient NPP is clinic responsibility; platform privacy at `/privacy` |
| O3 | Breach notification (US HHS) | Org | 6 | |
| O4 | Patient rights (access, amendment) | Not started | 5 | Data subject request API |
| O5 | Documentation retention (6 years audit) | Org | 3 | Policy Phase 3 |

---

## DPDP Act 2023 — Key obligations

| ID | Obligation | Status | Phase | Notes |
|----|------------|--------|-------|-------|
| D1 | Lawful purpose and consent | Partial | 5 | `user_consent_records` on registration; version validation |
| D2 | Notice (privacy notice in clear language) | Partial | 5 | `/privacy` page published |
| D3 | Data principal rights — access | Not started | 5 | Export API |
| D4 | Data principal rights — correction | Not started | 5 | |
| D5 | Data principal rights — erasure | Not started | 5 | Anonymization workflow |
| D6 | Data principal rights — grievance | Partial | 5 | Grievance contact in `/privacy` policy |
| D7 | Reasonable security safeguards | Partial | 1–4 | See technical section below |
| D8 | Breach notification to Board / principals | Not started | 5–6 | `security_incidents` + templates |
| D9 | Data Processing Agreement with processors | Org | 0 | [vendor-subprocessors.md](./vendor-subprocessors.md) |
| D10 | Purpose limitation and data minimization | Partial | — | Tenant scope; large pageSize export risk |
| D11 | Children's data (if applicable) | N/A | — | Clinic staff app; pediatric patients possible — consent via clinic |
| D12 | Cross-border transfer (if US hosting) | Partial | 0 | Documented in `/privacy` policy |

---

## Application security (supports both frameworks)

| ID | Control | Status | Phase | Implementation reference |
|----|---------|--------|-------|-------------------------|
| S1 | Strong password hashing (Argon2) | Done | — | `auth.service.ts`, `users.service.ts` |
| S2 | JWT + httpOnly refresh cookie | Done | — | `auth.routes.ts` |
| S3 | Production JWT secret enforcement | Done | 1 | `validate-config.ts`; static local secret in `.env.local.example` |
| S4 | No hardcoded default staff passwords | Not started | 7 | Deferred from Phase 1 — `Test@1234` in `types.ts` |
| S5 | Password complexity policy | Partial | 7 | Deferred from Phase 1; min 8 chars on register |
| S6 | MFA (TOTP) | Done | 2 | Platform toggle in Settings; mandatory for tenant users when enabled; admin-mediated reset by clinic owner or super admin |
| S7 | Password reset | Not started | 7 | |
| S8 | Account lockout | Not started | 7 | |
| S9 | CSRF protection (cookie routes) | Not started | 7 | |
| S10 | Access token not in persistent storage | Partial | 7 | `sessionStorage` in `api.ts` |
| S11 | Rate limiting | Done | 1 | Redis-backed in production via `rate-limit-factory.ts` |
| S12 | CORS restriction | Done | 1 | Rejects missing Origin in production |
| S13 | Swagger disabled in production | Done | 1 | `/api/docs` dev only |
| S14 | Structured logging without PHI | Done | 1 | `logger.ts` + error handler |
| S15 | Input validation (Zod) | Done | — | `shared/validation.ts` |
| S16 | SQL injection protection (ORM) | Done | — | Drizzle parameterized queries |
| S17 | Multi-tenant isolation | Done | — | [multi-tenancy.md](../multi-tenancy.md) |
| S18 | Branch/location isolation | Done | — | `location.ts` middleware |
| S19 | RBAC permissions | Done | — | [permissions.md](../permissions.md) |
| S20 | Audit log (write) | Partial | 3 | `audit.ts`; gaps on list reads |
| S21 | Audit log (read / review UI) | Not started | 3 | |
| S22 | PHI encryption at rest | Not started | 4 | |
| S23 | MySQL TLS verified | Partial | 1 | `rejectUnauthorized: true` in production; optional `DATABASE_SSL_CA` |
| S24 | Automated encrypted backups | Not started | 8 | |
| S25 | File upload security | N/A | — | Uploads not implemented |
| S26 | Public demo isolated (synthetic data) | Done | — | [public-demo.md](../public-demo.md) |
| S27 | Integration tests for isolation | Partial | — | `phase1.integration.spec.ts` |

---

## Phase completion tracker

| Phase | Description | Checklist items unlocked | Status |
|-------|-------------|--------------------------|--------|
| **0** | Documentation baseline | A2, A9, D9 (tracking), data inventory | **Done** |
| **1** | Security foundation | S3, S11–S14, S23, T8 (S4/S5 deferred) | **Done** |
| **2** | TOTP MFA | T7, S6 | **Done** |
| **3** | Full audit | T5, T6, S20, S21, O5 | Not started |
| **4** | Encryption | T4, S22, D7 | Not started |
| **5** | DPDP product | D1–D6, D8, O1, O4 | Not started |
| **6** | HIPAA org | A1, A5–A6, A9, O3, D8 | Not started |
| **7** | Auth hardening | S7–S10 | Not started |
| **8** | Backup / DR | A7, S24 | Not started |
| **9** | Verification | A8 | Not started |

---

## Sign-off (fill when phase complete)

| Phase | Completed date | Reviewed by | Notes |
|-------|----------------|-------------|-------|
| 0 | _2026-09-01_ | _Engineering_ | README, checklist, data inventory, vendor register |
| 1 | _2026-09-01_ | _Engineering_ | JWT validation, API hardening, logging, MySQL TLS (password work deferred) |
| 2 | _2026-09-01_ | _Engineering_ | TOTP MFA with Super Admin platform toggle |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |

---

## How to update

1. After completing a roadmap phase, change **Status** from Planned/Not started to Done or Partial.
2. Add the completion date in the phase tracker and sign-off table.
3. If new features add PHI fields, update [data-inventory.md](./data-inventory.md) first, then add rows here if new controls are needed.
