# Permissions

Permissions are API actions, not a single module switch.

## Catalog (Phase 1)

Staff: `STAFF_READ`, `STAFF_CREATE`, `STAFF_UPDATE`, `STAFF_ACTIVATE`  
Roles: `ROLE_READ`, `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `ROLE_ASSIGN_PERMISSIONS`, `USER_ASSIGN_ROLE`  
Business: `BUSINESS_READ`, `BUSINESS_UPDATE`  
Locations: `LOCATION_READ`, `LOCATION_CREATE`, `LOCATION_UPDATE`, `LOCATION_DELETE`

## Runtime

Owner / Admin / Manager with `ROLE_ASSIGN_PERMISSIONS` open **User Management → Roles → Permissions** and tick actions. `PUT /api/v1/roles/:id/permissions` replaces the set.

Guardrails:

- Owner role cannot be edited or have permissions changed.
- Last Owner cannot be deactivated.
- Manager cannot grant `ROLE_ASSIGN_PERMISSIONS` or `ROLE_DELETE`.
- Custom roles belong to one tenant.

Backend guards are authoritative. The UI only hides buttons.
