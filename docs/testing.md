# Testing

## Backend unit

```bash
cd backend
pnpm test
```

## Backend integration

```bash
cd backend
docker compose -f ../docker-compose.yml up mysql redis -d
pnpm db:fresh
RUN_INTEGRATION=true pnpm test
```

## Frontend e2e

Start backend and frontend, then:

```bash
cd frontend
E2E=true pnpm test:e2e
```
