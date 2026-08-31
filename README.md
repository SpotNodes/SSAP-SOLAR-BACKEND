# SSAP Solar — Backend

Production backend for the SSAP Solar customer app, website, and admin panel.
Express 5 + MongoDB (Mongoose 8) + TypeScript, built in phases per
`docs/BACKEND_PRD.md` in the app repo.

## Stack

Express 5 · MongoDB/Mongoose · Zod validation · JWT auth · pino logging · OpenAPI 3 (swagger-ui) ·
Vitest + Supertest + mongodb-memory-server for tests.

## Prerequisites

- Node.js 20+
- Docker (for local MongoDB replica set — required for multi-document transactions used by order
  placement)

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run seed
npm run dev
```

`GET http://localhost:4000/health` should return `{"data":{"status":"ok",...}}`.

Interactive API docs: `http://localhost:4000/docs` (raw spec at `/openapi.json`).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the API with hot reload (tsx watch) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` | Run the test suite (Vitest, against an in-memory Mongo replica set) |
| `npm run test:watch` | Test suite in watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run seed` | Idempotently seed categories/products and bootstrap the first admin account |

## Architecture

Layered, dependency-inverted, feature-first — mirrors the app's `src/features/*`:

```
Route → Controller → Service (use-case) → Repository (interface) → Mongoose model
```

Services depend on repository **interfaces**, not Mongoose directly. Each feature module owns its
routes/controller/service/repository/model/validation/mapper, composed at `src/container.ts`
(manual DI — no framework). `src/core/*` holds cross-cutting HTTP, error, logging, auth, and DB
infrastructure shared by every module.

Response envelopes, error codes, enums, and pagination follow the API contract fixed in the PRD —
see `src/core/errors/error-codes.ts` and `src/core/response/envelope.ts`. `src/openapi/schemas.ts`
holds the strict response-shape definitions shared by the OpenAPI doc and the contract tests in
`test/contract/` — a shape drift (a leaked internal field, a renamed key) fails both from one edit.

## Delivery phases

0. Foundations — config, error envelope, logging, DB connection, health check.
1. Auth & Users — customer OTP flow, admin email/password, JWT refresh rotation.
2. Catalogue — categories & products, search/filter/sort/paginate.
3. Orders — server-authoritative pricing, transactional stock, idempotency, state machine.
4. Notifications — device push tokens, Expo push, admin feed + email.
5. Enquiries/Leads — website lead capture + admin management. *(not yet built)*
6. Admin API — order/catalogue/inventory management.
7. Hardening — OpenAPI docs, contract tests, caching, security pass, Docker, deployment docs.

Order/status/payment events fire through `OrderEventPublisher`
(`src/modules/orders/order-events.ts`) — `NotificationOrderEventPublisher` (Phase 4) is the real
implementation; fire-and-forget by design (PRD §10: never blocks the request path), errors caught
and logged internally.

## Environment variables

Copy `.env.example` to `.env` and fill in real values before deploying. All variables:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | |
| `LOG_LEVEL` | no | `info` | pino level |
| `MONGODB_URI` | **yes** | — | Must point at a replica set (transactions require one) |
| `JWT_ACCESS_SECRET` | **yes** | — | Min 16 chars. Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | **yes** | — | Min 16 chars, **different** from the access secret |
| `JWT_ACCESS_TTL` | no | `15m` | |
| `JWT_REFRESH_TTL` | no | `30d` | |
| `ADMIN_ORIGIN` | no | `http://localhost:5173` | Comma-separated CORS allow-list (admin dashboard + website — the native app needs no entry) |
| `ADMIN_BOOTSTRAP_EMAIL` | no | — | If set with the password below, `npm run seed` creates this admin if none exists |
| `ADMIN_BOOTSTRAP_PASSWORD` | no | — | Min 8 chars |
| `ADMIN_NOTIFICATION_EMAIL` | no | falls back to `ADMIN_BOOTSTRAP_EMAIL` | Where new-order/cancellation alerts are sent |
| `OTP_PROVIDER` | no | `dev` | `dev` logs the code instead of sending SMS. Real adapters (MSG91/Twilio) are a config swap away — see `src/providers/otp/` |
| `PUSH_PROVIDER` | no | `dev` | `expo` works today — Expo's push API is keyless, no account needed. `dev` logs instead |
| `EMAIL_PROVIDER` | no | `dev` | No real SMTP adapter implemented yet — `dev` logs instead |
| `STORAGE_PROVIDER` | no | `dev` | Reserved for a future image-upload endpoint — product images accept HTTPS URLs directly today |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` | Base app-wide limiter window |
| `RATE_LIMIT_MAX` | no | `300` | Base app-wide limiter cap per window |

**Secrets:** never commit `.env`. Rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` invalidates every
outstanding session (all access tokens fail verification, all refresh tokens become unredeemable) —
expected if you suspect a leak, disruptive otherwise.

## Deployment

### Docker

```bash
docker build -t ssap-solar-backend .
docker run -p 4000:4000 --env-file .env ssap-solar-backend
```

Multi-stage build (`Dockerfile`): compiles TypeScript in a build stage, ships only `dist/` +
production `node_modules` in the final image, runs as a non-root user, and defines a container
`HEALTHCHECK` against `/health`.

`MONGODB_URI` must be reachable from wherever the container runs and must resolve to a replica set
whose members are reachable **from the container's network position** — a Mongo replica set
advertising `localhost:27017` (as `docker-compose.yml` does, for host-machine `npm run dev`) is
**not** reachable from a sibling container or a different host; point production at a real replica
set (e.g. MongoDB Atlas) or reconfigure the replica set's advertised member host to match how the
app actually connects to it.

### First deploy checklist

1. Provision MongoDB as a replica set (Atlas does this automatically).
2. Set every **Required** env var above with real values, generated secrets.
3. `npm run seed` once against production `MONGODB_URI` — seeds the catalogue and bootstraps the
   admin account from `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` (safe to rerun: idempotent).
4. Point the app's `EXPO_PUBLIC_API_BASE_URL` and the admin dashboard at the deployed origin.
5. Set `ADMIN_ORIGIN` to the real admin dashboard + website origins (comma-separated) — not the
   `localhost` default.

## Testing

`npm test` runs against a real MongoDB replica set spun up in-process
(`mongodb-memory-server`, single-node RS) — no Docker required for tests. Covers integration tests
per module (`test/integration/`) plus response-contract tests (`test/contract/`) that fail if a
response shape drifts from what's documented in `src/openapi/schemas.ts`.
