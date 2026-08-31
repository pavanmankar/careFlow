# Frontend portal

Next.js management UI. Talks to the backend only through REST.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

- http://localhost:3000
- Set `NEXT_PUBLIC_API_URL` if the API is not on http://localhost:3001
- E2E: `pnpm test:e2e` (API and web must be running)
