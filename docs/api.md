# API

Base path: `/api/v1`  
Swagger: `/api/docs`

Envelope:

```json
{ "success": true, "data": {}, "message": "Success", "traceId": "..." }
```

## Auth

- `POST /auth/register` — first name, last name, email, password, businessTypeId, businessName. Creates workspace + owner + business only.
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Masters

- `GET /business-types` (public)
- `POST|PUT /business-types` (platform admin)
- `GET /permissions?grouped=true`
- `GET /modules`

## Business

- `GET|PUT /tenants/current`
- `GET|PUT /business`
- `GET|POST /locations`
- `GET|PUT|DELETE /locations/:id`

## User Management

- `GET|POST /users`
- `GET|PUT /users/:id`
- `POST /users/:id/activate`
- `POST /users/:id/deactivate`
- `PUT /users/:id/roles`
- `GET|POST /roles`
- `GET|PUT|DELETE /roles/:id`
- `PUT /roles/:id/permissions`

Health: `/health`, `/health/live`, `/health/ready`
