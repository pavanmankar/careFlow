# Environments

CareFlow has two environments in this phase: **local** (your machine) and **shared cloud** (one public URL). They do not share a database.

| | Local | Shared cloud |
|---|---|---|
| Who | You, other feature work | Engineers sharing a stack |
| Web | `http://localhost:3000` | `https://mycareflow-dev.vercel.app` |
| API the browser sees | `http://localhost:3001` | same origin as the Vercel host (`/api/*`, `/health/*`) |
| API process | Compose / `pnpm dev` on `:3001` | Render Web Service (`careflow-api-dev`) |
| Data | Local MySQL + Redis | One cloud MySQL + one cloud Redis |

Demo and prod stacks are out of scope. `/demo` still works on the shared URL after `pnpm db:seed:public-demo` against the **dev** database.

---

## How the public URL talks to the API

```
Browser  →  https://mycareflow-dev.vercel.app
               │  rewrite /api/*  and  /health/*  (when API_REWRITE_ORIGIN is set)
               ▼
            Render  (e.g. https://careflow-api-dev.onrender.com)
```

Visitors never need a second hostname. Locally, `API_REWRITE_ORIGIN` is **unset**, so Next.js does not rewrite; the client calls `http://localhost:3001` directly.

---

## Frontend env

| Variable | Local | Vercel (`mycareflow-dev`) |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` (default if unset) | `https://mycareflow-dev.vercel.app` |
| `API_REWRITE_ORIGIN` | unset (no rewrite) | Render service URL, no trailing slash |

`NEXT_PUBLIC_*` is baked in at **build** time. After changing it on Vercel, redeploy.

Do **not** set local `NEXT_PUBLIC_API_URL` to the Vercel host. That would mix local UI with the shared database.

---

## Backend env

| Variable | Local | Render (`careflow-api-dev`) |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `API_PORT` | `3001` | unused (Render sets `PORT`) |
| `WEB_URL` | `http://localhost:3000` | `https://mycareflow-dev.vercel.app` |
| `CORS_ORIGINS` | unset | optional comma-separated extra origins (e.g. preview URLs) |
| `DATABASE_URL` | local MySQL | cloud MySQL |
| `REDIS_URL` | local Redis | cloud Redis |
| `JWT_SECRET` | example is fine locally | unique, long random string |

CORS allowlist is `WEB_URL` plus `http://localhost:3000`, `http://127.0.0.1:3000`, and any `CORS_ORIGINS` entries. `WEB_URL` must match the Vercel origin exactly (scheme + host, no trailing slash).

---

## First-deploy checklist

Do the code wiring (rewrites, CORS, this file) **before** the first GitHub push so the first deploy is correct.

1. **GitHub** — private repo, branch `develop`. Do not commit `.env` files.
2. **Data** — one MySQL and one Redis. Copy `DATABASE_URL` and `REDIS_URL`. Generate a long `JWT_SECRET`.
3. **Render** — Web Service, root `backend`, branch `develop`, build `pnpm install`, start `pnpm start`. Set the backend env table above. Copy the service URL (this is `API_REWRITE_ORIGIN`).
4. **Seed** (once), from a machine that can reach the **cloud** MySQL — not local Compose:

   ```bash
   cd backend
   pnpm db:migrate
   pnpm db:seed
   pnpm db:seed:public-demo
   ```

   Optional: `pnpm db:seed:demo` for the large Sunrise clinic. Never point these at a future prod database.

5. **Vercel** — project name `mycareflow-dev`, root `frontend`, production branch `develop`. Set the frontend env table above. Redeploy after saving env vars.
6. **Verify** — open `https://mycareflow-dev.vercel.app`

   - Landing page loads
   - `/demo` logs in as `demo@careflow.in` / `DemoViewer!234` (after seed)
   - Dashboard loads (free Render may sleep; first hit can take 30–60s)
   - Register/login uses the **dev** database only

If API calls 404: `API_REWRITE_ORIGIN` is missing or Vercel was not rebuilt. If CORS/cookie errors: `WEB_URL` must match the Vercel origin exactly.

---

## Daily work

1. Other feature: branch off `develop`, Compose, `localhost:3000` / `:3001`. Leave `API_REWRITE_ORIGIN` unset.
2. When ready: merge into `develop`, push; Vercel + Render auto-deploy; check the public URL.
3. Shared cloud and local databases stay separate.
