# How to run

Frontend and backend are separate. Start the API first, then the web app.

## Backend

```bash
cd backend
cp .env.example .env
cp .env.local.example .env.local
# Edit .env.local for your local MySQL credentials and static dev secrets (JWT_SECRET is pre-filled)
pnpm install
docker compose -f ../docker-compose.yml up mysql redis -d
pnpm db:fresh          # reset + migrate (masters + platform admin + public demo)
pnpm db:seed:demo      # optional
pnpm dev
```

Masters, platform admin (`superadmin@gmail.com` / `PlatformAdmin!234`), and public demo (`demo@careflow.in`) are applied by `pnpm db:migrate` via `drizzle/0001_seed_masters.sql` and `drizzle/0002_seed_public_demo.sql`.

Demo clinic login:

- Owner: `anita.desai@sunriseclinic.in` / `SunriseClinic!234`
- Doctor: `vikram.shah@sunriseclinic.in` / `SunriseClinic!234`

### Multi-factor authentication (MFA)

`pnpm db:migrate` (via `db:fresh`) applies the platform setting `mfa_authentication_enabled` (default off) along with the rest of the masters.

Super Admin can enable **Require MFA for all clinic users** in Settings. When enabled, all tenant users must enroll with an authenticator app on next sign-in. Turn MFA off for a specific clinic from **Clinics → clinic detail**.

If a user loses their authenticator app, MFA recovery is **not self-service**: clinic owners can reset 2FA for staff and doctors from their detail pages; platform super admins can reset any clinic user (including owners) from **Clinics → clinic detail → Employees**.

Public demo (`demo@careflow.in`) is included in `pnpm db:migrate` via `drizzle/0002_seed_public_demo.sql` (one-click demo works when MFA is on).

## Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

## Tests

```bash
cd backend
pnpm test

cd frontend
E2E=true pnpm test:e2e
```

## Compliance

Healthcare security and regulatory tracking (HIPAA, DPDP) lives in [docs/compliance/](compliance/README.md). Start with the [compliance checklist](compliance/compliance-checklist.md) and [data inventory](compliance/data-inventory.md) before deploying with real patient data.
