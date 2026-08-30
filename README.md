# SSAP Solar — Backend

Production backend for the SSAP Solar customer app, website, and admin panel.
Express 5 + MongoDB (Mongoose 8) + TypeScript, built in phases per
`docs/BACKEND_PRD.md` in the app repo.

## Stack

Express 5 · MongoDB/Mongoose · Zod validation · JWT auth · pino logging · Vitest + Supertest +
mongodb-memory-server for tests.

## Prerequisites

- Node.js 20+
- Docker (for local MongoDB replica set — required for multi-document transactions used by order
  placement)

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

`GET http://localhost:4000/health` should return `{"data":{"status":"ok",...}}`.

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
| `npm run seed` | Seed reference data (categories/products/admin bootstrap — lands in later phases) |

## Architecture

Layered, dependency-inverted, feature-first — mirrors the app's `src/features/*`:

```
Route → Controller → Service (use-case) → Repository (interface) → Mongoose model
```

Services depend on repository **interfaces**, not Mongoose directly. Each feature module owns its
routes/controller/service/repository/model/validation/mapper. `src/core/*` holds cross-cutting HTTP,
error, logging, and DB infrastructure shared by every module.

Response envelopes, error codes, enums, and pagination follow the API contract fixed in the PRD —
see `src/core/errors/error-codes.ts` and `src/core/response/envelope.ts`.

## Delivery phases

0. **Foundations** (this scaffold) — config, error envelope, logging, DB connection, health check.
1. Auth & Users — customer OTP flow, admin email/password, JWT refresh rotation.
2. Catalogue — categories & products, search/filter/sort/paginate.
3. Orders — server-authoritative pricing, transactional stock, idempotency, state machine.
4. Notifications — device push tokens, Expo push, admin feed.
5. Enquiries/Leads — website lead capture + admin management.
6. Admin API — order/catalogue/inventory management.
7. Hardening — OpenAPI docs, contract tests, caching, deployment.

Full plan: see the project plan doc shared with this repo.
