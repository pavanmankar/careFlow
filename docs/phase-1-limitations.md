# Phase 1 known limitations

- Node.js 20+ and pnpm 9+ must be installed on the host to run `pnpm install` / `pnpm dev`.
- Docker is required for MySQL, Redis, and `docker compose up`.
- Worker process only checks Redis health. It does not process jobs.
- Dashboard has empty states, not live metrics.
- Idempotency-Key header is reserved (table exists) but not fully wired in this phase.
- Google Calendar, payments, customers, bookings, and AI are not implemented.
