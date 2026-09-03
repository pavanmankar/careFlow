# Vendor and subprocessor register

CareFlow relies on third-party services to host and operate the platform. When real PHI or personal data is processed, each vendor below typically requires:

- **BAA** (Business Associate Agreement) — required under US HIPAA when the vendor handles PHI on your behalf
- **DPA** (Data Processing Agreement) — required under India DPDP when the vendor processes personal data

> **Status:** Tracking only. Agreements are **not signed** unless marked in the table below.

---

## Current stack (shared-dev)

From [environments.md](../environments.md) and [render.yaml](../../render.yaml):

| Vendor | Service | Data processed | Region / notes | BAA status | DPA status | Owner | Last reviewed |
|--------|---------|----------------|----------------|------------|------------|-------|---------------|
| **Vercel** | Frontend hosting, CDN, serverless rewrites | HTTP traffic, build env vars (no DB) | US/EU edge; confirm account region | Not started | Not started | _TBD_ | _TBD_ |
| **Render** | API hosting (Node) | Request/response bodies, env secrets (`DATABASE_URL`, `JWT_SECRET`) | US; confirm data residency | Not started | Not started | _TBD_ | _TBD_ |
| **MySQL provider** | Primary database | All application data including PHI | _Specify provider (e.g. Aiven, PlanetScale, RDS)_ | Not started | Not started | _TBD_ | _TBD_ |
| **Redis provider** | Cache / health (e.g. Upstash) | Minimal; session/rate-limit data if enabled | _Specify provider_ | Not started | Not started | _TBD_ | _TBD_ |
| **GitHub** | Source code, CI | Code only (no production PHI in repo) | — | N/A | N/A | _TBD_ | _TBD_ |

---

## Planned / optional vendors

| Vendor | Purpose | When needed | BAA/DPA |
|--------|---------|-------------|---------|
| **Email provider** (Resend, SendGrid, SMTP) | Password reset, notifications | Phase 7 | Required before sending user/patient email |
| **Object storage** (S3, R2) | Appointment documents, X-rays | When file upload is implemented | Required |
| **Error monitoring** (Sentry, etc.) | Production errors | If adopted; must disable PHI in payloads | BAA if PHI could appear |
| **Analytics** (PostHog, GA) | Product analytics | If adopted; must not send PHI | DPA; no PHI in events |

---

## Local development

| Component | Data | Compliance note |
|-----------|------|-----------------|
| Docker MySQL / local MySQL | Developer seed data | Must not use copies of production PHI on unsecured laptops |
| `localhost` HTTP | Dev traffic only | Not for real PHI |

---

## Vendor due diligence checklist

Before signing or renewing each vendor:

- [ ] Confirm what data they process and where it is stored (region)
- [ ] Obtain standard security documentation (SOC 2, ISO 27001, or security whitepaper)
- [ ] Execute BAA (HIPAA) and/or DPA (DPDP) as applicable
- [ ] Confirm encryption in transit and at rest
- [ ] Confirm subprocessors list and notification process
- [ ] Confirm breach notification timeline (e.g. 72 hours)
- [ ] Document account owner and renewal date in table above

---

## Action items

1. **Name the MySQL and Redis providers** used in production (fill in region column).
2. **Assign an owner** for each vendor relationship.
3. **Request BAAs/DPAs** from Vercel, Render, and database host before go-live with real patient data.
4. Re-review this register **quarterly** or when adding a new integration.
