# Database

MySQL 8 (InnoDB, utf8mb4) with Drizzle.

## Masters

- `metadata` — business types, appointment types, and other lookup lists
- `modules` — Staff, Business, Locations, Roles
- `permissions` — one row per API action (View staff, Add staff, …)

## Tenant-owned

- `tenants` — workspace created at registration; name copied from name of business
- `businesses` — one business per tenant in Phase 1; `businessType` is a code from `metadata`
- `locations`
- `users` — owner created at register; other staff added later
- `roles` — per-tenant copies of system roles plus custom roles
- `role_permissions` — runtime grants
- `user_roles`
- `refresh_tokens`

Timestamps are stored in UTC (`DateTime(3)`). JSON columns hold address and settings.

## Indexes

tenantId on tenant-owned tables; unique email on users; unique location code per business; unique role code per tenant.
