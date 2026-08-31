# CareFlow

Frontend and backend are separate projects. They communicate only over HTTP.

```
careflow/
  backend/     Node.js + TypeScript API, Drizzle, MySQL, Redis worker
  frontend/    Next.js portal
```

## Backend

```bash
cd backend
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm dev
```

API: http://localhost:3001  
Swagger: http://localhost:3001/api/docs

`pnpm db:seed` loads masters and the platform admin (`superadmin@gmail.com` / `PlatformAdmin!234`).  
`pnpm db:seed:demo` is optional and fills **one** clinic (Sunrise Dental Clinic) with 500 patients and about a year of dental visits. Running it again replaces that clinic’s operational rows only. Login: `anita.desai@sunriseclinic.in` / `SunriseClinic!234`.

## Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Web: http://localhost:3000  
The portal calls `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

## Docker (both)

From this folder:

```bash
docker compose up --build
```

## Docs

See [docs/](docs/).
