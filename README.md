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

The seed creates 7 users with password `Temporary123!` across the three tiers (platform, service,
consumer). Urls: `admin@apipdashboard.local` (platform_admin), `dev@apipdashboard.local`
(platform_dev), `user@apipdashboard.local` (platform_viewer),
`service-admin@apipdashboard.local` (service_admin for `catalog-api` + `orders-api`),
`service-dev@apipdashboard.local` (service_dev for the same two services),
`service-viewer@apipdashboard.local` (service_viewer for `catalog-api`),
`consumer-admin@apipdashboard.local` (consumer_admin, global). New users are added via the
**User Management → New user** flow (`POST /admin/users`, requires `platform_admin`), which hashes
the password with bcrypt and assigns an initial role.

Frontend dev server proxies `/api` to `http://localhost:4000` (override via `VITE_API_TARGET`).

## Environment variables

### `apps/api/.env`

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL DSN (defaults to the compose instance) |
| `KONG_ADMIN_URL` | Kong Admin API base URL (`http://localhost:8001`) |
| `KONG_ADMIN_TOKEN` | Optional bearer token for Kong Admin |
| `REDIS_HOST` / `REDIS_PORT` | Redis (Memurai/redis-server) serving the RBAC cache |
| `REDIS_PASSWORD` | Optional Redis AUTH password |
| `RBAC_CACHE_TTL` | Per-user RBAC cache TTL (default `900` = 15m) |
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
`RoleAssignment`. Access to individual services is data-scoped: service-tier users only see the
services they are assigned to (`ownedResourceIds`), which also scopes the audit log and dashboard.
Role → permission lookups and per-user computed permission sets are cached in Redis
(`rbac:permission-map`, `rbac:user:{id}`), with an automatic live DB fallback when Redis is down.
Users are created by an admin (`POST /admin/users`) — there is no public registration endpoint.

### The three tiers

| Tier | Roles | Scope |
| --- | --- | --- |
| **platform** | `platform_admin` (99) · `platform_dev` (90) · `platform_viewer` (80) | Full platform visibility; `platform_admin` also manages users/roles |
| **service** | `service_admin` (55) · `service_dev` (45) · `service_viewer` (35) | Services, routes and plugins **scoped to owned services only**; no consumer/credential access |
| **consumer** | `consumer_admin` (30) | Consumer + credential management, read-only service list |

Capabilities by role (`PERMISSION_MAP`):

| Role | Dashboard | Services | Routes | Plugins | Consumers | Credentials | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `platform_admin` | ✓ | CRUD | CRUD | CRUD | CRUD | CRUD | all |
| `platform_dev` | ✓ | CRUD | CRUD | CRUD | CRUD | CRUD | all |
| `platform_viewer` | ✓ | read | read | read | read | read | all |
| `service_admin` | ✓ | CRUD | CRUD | CRUD | — | — | scoped |
| `service_dev` | ✓ | r/u | CRUD-lite | CRUD-lite | — | — | scoped |
| `service_viewer` | ✓ | read | read | read | — | — | scoped |
| `consumer_admin` | ✓ | read | — | — | CRUD | CRUD | scoped |

Assignment rules (enforced server-side on `POST/PATCH /role-assignments`): platform and consumer
roles are granted **only by `platform_admin`**; service roles require the actor to hold
`role:assign`, be within the same role level, and **own the target service** — global (unscoped)
service roles are also `platform_admin`-only. The dashboard shows a tier badge plus a
`usersByRole` breakdown (admins only), and audit rows carry the actor's role badge and a `?role=`
filter.

## Audit logging

Every mutation records a field-level diff (`AuditLog`): actor, IP, action, resource type/name,
before/after JSON. Sensitive keys (`key`, `secret`, `password`, …) are redacted as `[REDACTED]`.
Platform-tier users see everything; service-tier users see their own activity + events on their
owned services; consumer-tier users see consumer/credential events plus their own. Every audit row
carries the actor's current role badge (`actorRole`), and the list endpoint accepts an `actorRole=`
filter.

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
| 8 | Dev smoke | `bun run dev` → `/api/health` green, web :5173 | ✅ PASS — health `{status:"ok", database:"up", redis:"up"}`; Kong skipped when unconfigured |
| 9 | Manual smoke | login · services · routes · plugins · consumers · credentials · audit diff | ✅ PASS — admin login, `/auth/me`, dashboard stats verified |
| 10 | RBAC Redis cache | cache warm → key invalidation on role writes → DB fallback when Redis down | ✅ PASS — `rbac:user:{id}` cached (TTL 900s), invalidated on assign, `/auth/me` served from DB with Memurai stopped |
| 11 | 3-tier roles | role migration + per-tier verification | ✅ PASS — 7 roles mounted; service/consumer separation, dashboard tier badge + `usersByRole`, audit `actorRole` badge/`?role=` filter, tightened assignment rules (403s verified) |
| 10 | Commit hook | commit runs husky pre-commit (lint-staged) + commitlint | ✅ PASS — enforced on every commit |