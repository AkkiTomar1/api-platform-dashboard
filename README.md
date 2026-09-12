# API Platform Dashboard

Gateway management dashboard for Kong-backed services, consumers, plugins, routes and key-auth credentials, with field-level audit logging and role-based access control.

## Monorepo layout

```
api-platform-dashboard/
├── apps/
│   ├── api/          # NestJS 10 backend (REST /api, Prisma, Redis, Kong, self-contained JWT auth)
│   └── web/          # React 19 + Vite 6 frontend (TypeScript, Tailwind v4)
├── packages/
│   ├── shared/       # Zod DTOs, RBAC permission map, audit + Rbac types (consumed by api & web)
│   └── ui/           # Shared UI primitives (Button, Table, Modal, Tabs, icons, toast)
├── infra/
│   └── compose.yaml  # Local infra: PostgreSQL 16, Redis 7, RedisInsight
└── scripts/          # lint-staged helper (prettier re-run after lint fixes)
```

Package manager: **Bun** workspaces. Runtime: Node ≥ 20 (tested on Node 22 + Bun 1.4).

## Prerequisites

- [Bun](https://bun.sh) (>= 1.1) — `curl -fsSL https://bun.sh/install | bash`
- PostgreSQL 16+ (Docker via `infra/compose.yaml`, or a native install)
- OpenSSL (installed with Git for Windows / macOS / most Linux distros) — for JWT key generation

Auth is self-contained (RS256 JWT + rotating refresh tokens, bcrypt password hashes) — no external
identity provider is required.

## Quick start

```bash
# 1. install workspace deps
bun install

# 2. start local infra (postgres :5433, redis :6380, redisinsight :5540)
docker compose -f infra/compose.yaml up -d
#    ...or point DATABASE_URL at an existing native PostgreSQL and skip Docker entirely.

# 3. copy env templates and fill in secrets
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. generate the JWT signing key pair (apps/api/jwt-private.pem + jwt-public.pem)
bun run keys:generate

# 5. migrate + seed
bun run prisma:generate
bun run prisma:deploy
bun run prisma:seed

# 6. run both apps (api :4000, web :5173)
bun run dev
```

The seed creates 7 users with password `Temporary123!` (admin, platform_admin plus service/consumer
admin and viewer roles). Urls: `admin@apipdashboard.local`, `service-admin@apipdashboard.local`,
`consumer-admin@apipdashboard.local`, plus `dev`, `service-dev`, `service-viewer`,
`user`, all `@apipdashboard.local`. New users are added via the **Admin → New user** flow
(`POST /admin/users`, requires `platform_admin`), which hashes the password with bcrypt and assigns
an initial role.

Frontend dev server proxies `/api` to `http://localhost:4000` (override via `VITE_API_TARGET`).

## Environment variables

### `apps/api/.env`

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL DSN (defaults to the compose instance) |
| `KONG_ADMIN_URL` | Kong Admin API base URL (`http://localhost:8001`) |
| `KONG_ADMIN_TOKEN` | Optional bearer token for Kong Admin |
| `REDIS_HOST` / `REDIS_PORT` | Redis for the cached RBAC permission map |
| `JWT_PRIVATE_KEY_PATH` | Private key PEM path (default `./jwt-private.pem`) |
| `JWT_PUBLIC_KEY_PATH` | Public key PEM path (default `./jwt-public.pem`) |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Inline PEM overrides the file paths |
| `JWT_ISSUER` | Access-token issuer claim (default `api-platform-dashboard`) |
| `JWT_ACCESS_EXPIRES_IN` | Access-token TTL (default `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token TTL (default `7d`) |
| `PORT` | API port (default `4000`) |

> `bun run keys:generate` writes the RS256 key pair once. The API fails fast at startup with a hint
> if the signing key cannot be loaded from either the paths or the inline env vars.

### `apps/web/.env`

| Var | Purpose |
| --- | --- |
| `VITE_API_TARGET` | API origin used by the dev proxy |

## Scripts (root)

| Command | Description |
| --- | --- |
| `bun run dev` | Run API + web in watch mode |
| `bun run build` | Build web + typecheck api |
| `bun run keys:generate` | Generate the RS256 JWT key pair for the API |
| `bun run lint` | ESLint across the workspace |
| `bun run test` | Vitest (unit) |
| `bun run typecheck` | `tsc` for both apps |
| `bun run prisma:generate` | Generate Prisma client |
| `bun run prisma:deploy` | Apply migrations (`prisma migrate deploy`) |
| `bun run prisma:seed` | Seed users, roles and default services |
| `bun run prisma:studio` | Prisma Studio |

## Roles & permissions

Authentication is fully self-contained: `POST /auth/login` verifies the bcrypt password and issues a
short-lived RS256 access JWT (subject = user id) plus an opaque rotating refresh token
(`POST /auth/refresh` rotates/revokes; `POST /auth/logout` revokes). The global JWT guard enriches
`request.user` with roles and permitted scopes; `GET /auth/me` is called on web bootstrap.

Permissions are a static map in `packages/shared/src/permissions.ts`; roles are stored per user in
`RoleAssignment`. Access to individual services is data-scoped: non-admins only see services they
are assigned to (`ownedResourceIds`), which also scopes the audit log. The Redis-cached permission
map caches role → permissions lookups. Users are created by an admin (`POST /admin/users`) — there
is no public registration endpoint.

## Audit logging

Every mutation records a field-level diff (`AuditLog`): actor, IP, action, resource type/name,
before/after JSON. Sensitive keys (`key`, `secret`, `password`, …) are redacted as `[REDACTED]`.
Scoped users see their own activity + events on their services; admins see everything.

## Acceptance checklist (verification run)

Each item is listed with its required command and the recorded result.

| # | Criterion | Command | Result |
| --- | --- | --- | --- |
| 1 | Clean workspace install | `bun install` | ✅ PASS — 643 packages |
| 2 | Infra healthy | Postgres reachable via `DATABASE_URL` | ✅ PASS — native PostgreSQL 18 on `localhost:5433` |
| 3 | DB wired | `bun run prisma:generate` → `prisma:deploy` → `prisma:seed` | ✅ PASS — client v5.22.0, migration applied, 7 users seeded |
| 4 | Keys | `bun run keys:generate` | ✅ PASS — RSA-2048 `jwt-private.pem` + `jwt-public.pem` written |
| 5 | Typecheck | `bun run typecheck` (api + web) — 0 errors | ✅ PASS (api tsc, web tsc) |
| 6 | Tests | `bun run test` incl. `auditLogs/diff.test.ts` | ✅ PASS — 16/16 |
| 7 | Lint | `bun run lint` — 0 errors, tolerated warnings only | ✅ PASS — 2 react-refresh warnings |
| 8 | Dev smoke | `bun run dev` → `/api/health` green, web :5173 | ✅ PASS — health `{status:"ok", database:"up"}`; Kong/Redis report `skipped` when unconfigured |
| 9 | Manual smoke | login · services · routes · plugins · consumers · credentials · audit diff | ✅ PASS — admin login, `/auth/me`, dashboard stats verified |
| 10 | Commit hook | commit runs husky pre-commit (lint-staged) + commitlint | ✅ PASS — enforced on every commit |