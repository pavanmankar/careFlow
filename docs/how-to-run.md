# How to run

Frontend and backend are separate. Start the API first, then the web app.

## Backend

```bash
cd backend
cp .env.example .env
pnpm install
docker compose -f ../docker-compose.yml up mysql redis -d
pnpm db:push
pnpm db:seed
pnpm db:seed:demo
pnpm dev
```

Masters and the platform admin come from `pnpm db:seed`. Optional `pnpm db:seed:demo` fills **one** clinic (Sunrise Dental Clinic) with 500 patients and about a year of dental visits. Running it again wipes and replaces that clinic’s patients, appointments, and visit rows only.

Demo clinic login:

- Owner: `anita.desai@sunriseclinic.in` / `SunriseClinic!234`
- Doctor: `vikram.shah@sunriseclinic.in` / `SunriseClinic!234`

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
