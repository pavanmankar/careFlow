# Public demo clinic

CareFlow includes a separate **read-only demo tenant** for visitors who want to explore the product without signing up.

## Setup

Public demo data is applied by `pnpm db:migrate` via `drizzle/0002_seed_public_demo.sql` (included in `pnpm db:fresh`).

```bash
cd backend
pnpm db:fresh
```

Then start the API and frontend as usual.

To change demo data, edit `drizzle/0002_seed_public_demo.sql` (or regenerate with `npx tsx scripts/generate-public-demo-sql.ts` using `PHI_ENCRYPTION_KEY` from `.env.local.example`).

## Branches (locations)

- CareFlow does **not** create a default location on registration.
- Patients, doctors, staff, roles, appointments, inventory, and dashboard metrics are **scoped to the selected branch** (`X-Location-Id`).
- Calendar and appointment booking require at least one active location and a selected branch.
- After login: **0 locations** (or no membership) → portal works but booking is blocked; **1 accessible location** → auto-selected; **2+** → `/select-branch` picker.
- Tenant owners can access all active locations; other staff only see branches they belong to.
- The public demo migration includes one location so demo browsing works.

## Demo credentials

| Field | Value |
|-------|-------|
| Clinic | CareFlow Demo Clinic |
| Email | `demo@careflow.in` |
| Password | `DemoViewer!234` |

## Entry points

- **Landing page:** `/` → **Try Live Demo**
- **Auto-login:** `/demo`
- **Manual login:** `/login` (use credentials above)

## What demo users can do

With the `DEMO_VIEWER` role, users receive read-only permissions:

- View dashboard, patients, doctors, appointments, calendar, and inventory
- Open visit charts and preview completed visit data

## What demo users cannot do

The demo role excludes all create/update/delete permissions. The UI hides action buttons and the API returns `403` for mutations, including:

- Booking or rescheduling appointments
- Editing visit charts, medicines, or charges
- Adding patients, doctors, or inventory items
- Staff and role management

## Internal owner account

The migration also creates an internal owner account used only to provision the demo tenant:

- Email: `owner@careflow-demo.in`
- Password: `OwnerDemo!234`

Do not publish this account on the public landing page.

## Sample data volume

The migration seeds approximately:

- 5 patients
- 8 appointments across 2 demo days (30–31 Aug 2026; mixed statuses)
- 2 doctors
- 1 location
- 5 inventory items
