# Backend API

Node.js + TypeScript + Express. No NestJS.

## Environment files

Load order (later overrides earlier): `.env` → `.env.${APP_ENV}` → `.env.local`

| File | Use |
|------|-----|
| `.env.example` | Template (committed) |
| `.env.local` | Local MySQL/Redis — wins over everything (gitignored) |
| `.env.development` | Shared careflow-dev when `APP_ENV=development` (gitignored) |

```bash
# Local (recommended)
cp .env.local.example .env.local
# edit DATABASE_URL / REDIS_URL for localhost
pnpm install
docker compose -f ../docker-compose.yml up mysql redis -d
pnpm db:fresh
pnpm db:seed:demo
pnpm dev

# Against shared careflow-dev (optional)
cp .env.development.example .env.development
# fill Aiven/Upstash secrets — never commit
# PowerShell: $env:APP_ENV="development"
# bash: export APP_ENV=development
# Tip: remove or rename .env.local so it does not override remote URLs
pnpm dev
```

Hosted (Render): set env vars in the dashboard; local files are optional.

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

### Schema changes

```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration SQL
pnpm db:generate
# 3. Review drizzle/*.sql
# 4. Apply locally
pnpm db:migrate
# 5. Commit schema.ts + drizzle/*.sql + meta/
```

For data backfills (not DDL), add a numbered SQL file under `drizzle/`.

### Reference data and demos (SQL migrations)

| Migration | Contents |
|-----------|----------|
| `drizzle/0001_seed_masters.sql` | Modules, permissions, metadata, platform admin |
| `drizzle/0002_seed_public_demo.sql` | Public demo clinic (`demo@careflow.in` / `DemoViewer!234`) |

Applied by `pnpm db:migrate` (included in `pnpm db:fresh`).

To change masters or public demo on a fresh DB, edit the SQL files directly. Regenerate public demo SQL with `npx tsx scripts/generate-public-demo-sql.ts` (uses `PHI_ENCRYPTION_KEY` from `.env.local.example`).

`pnpm db:seed:demo` optionally fills the large Sunrise Dental Clinic dataset.

Platform admin: `superadmin@gmail.com` / `PlatformAdmin!234`  
Public demo: `demo@careflow.in` / `DemoViewer!234` — see [`docs/public-demo.md`](../docs/public-demo.md).

- http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Tests: `pnpm test`

The frontend calls this API over HTTP only.
