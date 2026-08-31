# Backend API

Node.js + TypeScript + Express. No NestJS.

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm db:seed:public-demo
pnpm dev
```

- http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Tests: `pnpm test`

`pnpm db:seed` loads masters and the platform admin. `pnpm db:seed:demo` optionally fills one clinic (Sunrise Dental Clinic) with 500 patients and about a year of dental visits (wipe + insert for that clinic only). Owner login: `anita.desai@sunriseclinic.in` / `SunriseClinic!234`.

`pnpm db:seed:public-demo` creates a separate read-only demo clinic for the public landing page. Login: `demo@careflow.in` / `DemoViewer!234`. See [`docs/public-demo.md`](../docs/public-demo.md).

The frontend calls this API over HTTP only.
