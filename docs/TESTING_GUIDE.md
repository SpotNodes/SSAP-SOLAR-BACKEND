# Testing Guide — for the team

How to get this running locally and how to actually verify it works, not just that it boots.

## Prerequisites

| Tool | Why | Check |
|---|---|---|
| Node.js 20+ | Runtime | `node -v` |
| npm | Package manager (ships with Node) | `npm -v` |
| Docker Desktop | Local MongoDB **replica set** — orders use multi-document transactions, which plain standalone Mongo can't do | `docker -v` |

You do **not** need Docker running to run the automated test suite (`npm test`) — it spins up its
own throwaway in-memory Mongo replica set. Docker is only needed for `npm run dev` (a real,
persistent local database) and for building/running the Docker image.

## Setup

```bash
git clone <repo-url>
cd "SSAP Solar backend"
cp .env.example .env
docker compose up -d      # starts Mongo as a single-node replica set
npm install
npm run seed               # idempotent: 6 categories, 16 products, bootstraps the admin account
npm run dev                 # http://localhost:4000
```

Confirm it's up: `curl http://localhost:4000/health` → `{"data":{"status":"ok",...}}`.

**Admin login:** `admin@ssapsolar.com` / whatever `ADMIN_BOOTSTRAP_PASSWORD` is set to in your
`.env` (defaults to `change-me-strong-password` if you never changed it — change it if this ever
touches a real environment).

**Dev-mode OTP:** no real SMS is sent. The 6-digit code is printed in the `npm run dev` terminal:
```
[dev-otp] OTP code (not actually sent)  mobile: "+919876543210"  code: "123456"
```
Codes expire in 5 minutes — if you wait too long between requesting and verifying, you'll get
`OTP_INVALID` (the record's already gone) and need to request a fresh one.

## 1. Automated tests (do this first)

```bash
npm test
```
72 tests, no Docker required. If this is red, nothing below will work either — fix this first.

```bash
npm run lint    # should be clean
npm run build   # type-checks + compiles; should be clean
```

## 2. Manual / exploratory testing

Two options, same underlying spec:

- **Swagger UI:** with `npm run dev` running, open `http://localhost:4000/docs`. Click a route,
  "Try it out", fill in the body, execute. For authenticated routes, click the 🔒 icon top-right
  and paste `Bearer <accessToken>` once — it's remembered for the rest of the session.
- **Postman/Insomnia:** import `http://localhost:4000/openapi.json` as an OpenAPI spec — same
  endpoint list, in your own client.

See [`API_REFERENCE.md`](./API_REFERENCE.md) for curl walkthroughs of the trickier flows (OTP,
idempotent order creation, admin status transitions) if you'd rather use curl directly.

## 3. What to actually verify

Not just "does it 200" — these are the behaviors that matter and are easy to accidentally break.

### Auth
- [ ] Full cycle: OTP request (REGISTER) → verify → register → get `accessToken` + `user`
- [ ] `OTP_INVALID` on wrong code; after 5 wrong attempts, `OTP_LOCKED` (429)
- [ ] `ACCOUNT_NOT_FOUND` requesting a LOGIN OTP for a mobile with no account; `ACCOUNT_EXISTS`
      requesting REGISTER for one that already has one
- [ ] `PATCH /users/me` with a `mobile` field in the body — response mobile is unchanged
- [ ] `POST /auth/refresh` returns a **new** refresh token; the **old** one now fails with
      `TOKEN_INVALID` if you try it again
- [ ] Admin: wrong password → `INVALID_CREDENTIALS`; correct → token pair

### Catalogue
- [ ] `GET /products?categoryId=batteries&sort=priceLowHigh` — filtered and sorted correctly
- [ ] `GET /products?inStock=true` excludes `OUT_OF_STOCK` but **includes** `LOW_STOCK`
- [ ] An admin-deactivated product disappears from `GET /products` and `GET /products/:id` (404)
      but is still visible via `GET /admin/products/:id`

### Orders (the important one)
- [ ] Send a `POST /orders` with a bogus `price`/`total` in the body — response uses the **real**
      product price, not what you sent
- [ ] Order a quantity greater than `inventoryQuantity` → `409 INSUFFICIENT_STOCK`, stock unchanged
- [ ] Same `Idempotency-Key` sent twice → same order both times, stock decremented **once**
- [ ] Cancel a `PENDING` order → stock restored, `status: CANCELLED`; cancel it again → `409
      ORDER_NOT_CANCELLABLE`
- [ ] An `ADMIN` token gets `403 FORBIDDEN` on `POST /orders` (orders are customer-only — admins
      have no profile to snapshot into the order)

### Admin
- [ ] A `CUSTOMER` token gets `403 FORBIDDEN` on any `/admin/*` route
- [ ] `PATCH /admin/orders/:id/status` with an illegal jump (e.g. `PENDING` → `DELIVERED`) →
      `409 INVALID_STATUS_TRANSITION`
- [ ] Admin-cancelling an order (`status: CANCELLED` via the status route) restocks inventory,
      same as the customer cancel endpoint
- [ ] `GET /admin/orders/:id` includes `statusHistory` with `byRole` for each entry; the
      customer-facing `GET /orders/:id` does **not** include `statusHistory` at all

### Notifications
- [ ] Placing an order with a device registered (`POST /devices` first) logs a `[dev-push]` line
      in the server terminal
- [ ] Placing/cancelling an order creates an entry in `GET /admin/notifications` and logs a
      `[dev-email]` line
- [ ] Admin-only status/payment changes do **not** create an admin-feed notification (only
      order-placed and order-cancelled do — the admin who made the change doesn't need telling)

### Enquiries
- [ ] `POST /enquiries` (no auth) succeeds and shows up in `GET /admin/notifications`
- [ ] Send 11 enquiry submissions from the same IP within 15 minutes → the 11th gets
      `429 RATE_LIMITED`

## Troubleshooting

**`npm run dev` hangs forever, never logs "MongoDB connected"** — almost certainly a
replica-set-addressing mismatch, not a real hang. `docker-compose.yml`'s Mongo advertises
`localhost:27017` as its replica set member address, which only resolves correctly when the app
runs directly on your host machine. If you're running the app *inside a container* on the same
Docker network, it needs to reach Mongo via the container name (`mongo:27017`) instead — the two
setups need different replica-set configs. `npm run dev` (host machine) is the one this repo's
`docker-compose.yml` is configured for out of the box.

**`docker compose up -d` fails / port 27017 already in use** — another Mongo (or another clone of
this repo) is already running. `docker ps` to check, stop the conflicting container, or change the
published port in `docker-compose.yml`.

**Tests hang or time out** — check nothing else is holding port resources; `mongodb-memory-server`
downloads a Mongo binary on first run (needs network access once, then caches it).

**Getting `401 TOKEN_EXPIRED` mid-session** — access tokens last 15 minutes. Call
`POST /auth/refresh` (or `/admin/auth/refresh`) with your refresh token to get a new pair.
