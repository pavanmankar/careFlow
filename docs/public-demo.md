# Public demo clinic

CareFlow includes a separate **read-only demo tenant** for visitors who want to explore the product without signing up.

## Setup

From the backend directory:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:migrate-location-branch
pnpm db:seed:public-demo
```

Then start the API and frontend as usual.

Re-run `pnpm db:seed:public-demo` any time to reset demo patients, appointments, and inventory back to the sample dataset.

## Branches (locations)

- CareFlow does **not** create a default location on registration.
- Calendar and appointment booking require at least one active location and an `X-Location-Id` header (selected branch).
- After login: **0 locations** → portal works but booking is blocked; **1 location** → auto-selected; **2+** → `/select-branch` picker.
- The public demo seed always includes one location so demo browsing works.

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

The seed also creates an internal owner account used only to provision the demo tenant:

- Email: `owner@careflow-demo.in`
- Password: `OwnerDemo!234`

Do not publish this account on the public landing page.

## Sample data volume

Each reset seeds approximately:

- 5 patients
- 5 appointments (mixed statuses)
- 2 doctors
- 1 location
- 5 inventory items
