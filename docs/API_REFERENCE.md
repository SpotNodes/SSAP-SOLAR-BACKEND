# SSAP Solar API — Reference

Base URL: `http://localhost:4000/api/v1` (local dev). All paths below are relative to this.

**Live interactive docs:** run the server and open `http://localhost:4000/docs` (Swagger UI —
lets you "Try it out" against a running server with full request/response schemas per field). The
raw spec is at `/openapi.json`. This document is the readable companion — it explains the *flows*
that are awkward to convey in a spec (OTP two-step, idempotency, admin state machine), with a full
endpoint index and worked examples. When they disagree, `/docs` (generated straight from the
validation schemas) is the source of truth for exact field shapes.

---

## Conventions

### Auth
`Authorization: Bearer <accessToken>` header. Two roles: `CUSTOMER`, `ADMIN` — separate login
flows, separate token pairs. Access tokens expire in **15 minutes**; refresh tokens in **30 days**
and rotate on every use (the old one stops working the moment you refresh).

### Response envelopes
Single resource / action:
```json
{ "data": { /* ... */ } }
```
Paginated list:
```json
{ "data": [ /* ... */ ], "meta": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 } }
```
Error (all non-2xx):
```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "Incorrect OTP. Please try again.",
    "details": [{ "field": "otp", "message": "must be 6 digits" }],
    "requestId": "req_...",
    "timestamp": "2026-08-31T09:05:00.000Z"
  }
}
```
`details` only appears for validation-style errors. `message` is safe to show a user directly.

### Pagination
Query params `page` (default 1) and `pageSize` (default 20, max 100) on every list endpoint.

### Money & dates
Integer INR, no decimals (₹14,999 → `14999`). All timestamps are ISO 8601 UTC strings.

### Idempotency
`POST /orders` accepts an `Idempotency-Key` header (or `idempotencyKey` body field). Retrying the
same request with the same key returns the original order instead of creating a duplicate —
including under real concurrency (two simultaneous requests with the same key still produce
exactly one order).

---

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query failed schema validation — see `details[]` |
| 401 | `UNAUTHENTICATED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token expired — call `/auth/refresh` |
| 401 | `TOKEN_INVALID` | Refresh token invalid, expired, or already used |
| 401 | `INVALID_CREDENTIALS` | Admin email/password login failed |
| 403 | `FORBIDDEN` | Authenticated, but wrong role for this route |
| 404 | `ROUTE_NOT_FOUND` | No matching route |
| 404 | `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` / `CATEGORY_NOT_FOUND` / `ENQUIRY_NOT_FOUND` | Unknown id (or not owned by caller, for orders) |
| 409 | `ACCOUNT_EXISTS` | Register with a mobile that already has an account |
| 404 | `ACCOUNT_NOT_FOUND` | Login/OTP request for a mobile with no account |
| 400 | `OTP_INVALID` | Wrong code |
| 410 | `OTP_EXPIRED` | Code expired (5 min) or request record no longer exists |
| 429 | `OTP_LOCKED` | Too many wrong attempts on one code (5 max) |
| 429 | `RATE_LIMITED` | Too many requests — see per-endpoint limits below |
| 400 | `VERIFICATION_INVALID` | Missing/expired/already-used `verificationToken` |
| 409 | `INSUFFICIENT_STOCK` | Not enough inventory at order placement |
| 409 | `PRODUCT_UNAVAILABLE` | Unknown or inactive product in an order line |
| 409 | `ORDER_NOT_CANCELLABLE` | Order already shipped/delivered/cancelled |
| 409 | `INVALID_STATUS_TRANSITION` | Admin attempted an illegal order-status jump |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Rate limits:** OTP request 20/15min per IP (+ business rules: 1 per 30s per mobile, 5/hour per
mobile); admin login 10/15min; enquiry submission 10/15min per IP; everything else shares the
base 300/15min app-wide limit.

---

## Endpoint index

### Public / customer

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` *(no `/api/v1` prefix)* | none | Liveness check |
| POST | `/auth/otp/request` | none | Send a 6-digit OTP for login or registration |
| POST | `/auth/otp/verify` | none | Exchange OTP for a short-lived `verificationToken` |
| POST | `/auth/login` | none (needs `verificationToken`) | Complete login → token pair + user |
| POST | `/auth/register` | none (needs `verificationToken`) | Complete registration → token pair + user |
| POST | `/auth/refresh` | none (needs refresh token) | Rotate token pair |
| POST | `/auth/logout` | Bearer | Revoke a refresh token |
| GET | `/users/me` | Bearer | Caller's profile |
| PATCH | `/users/me` | Bearer | Update profile (mobile is immutable) |
| GET | `/categories` | none | Active categories, sorted |
| GET | `/products` | none | Search/filter/sort/paginate products |
| GET | `/products/:id` | none | Single product |
| POST | `/orders` | Bearer (CUSTOMER) | Place an order — server computes price/total |
| GET | `/orders` | Bearer (CUSTOMER) | Caller's orders, newest-first |
| GET | `/orders/:id` | Bearer (CUSTOMER) | One of the caller's orders |
| POST | `/orders/:id/cancel` | Bearer (CUSTOMER) | Cancel (restocks inventory) |
| POST | `/devices` | Bearer | Register an Expo push token |
| DELETE | `/devices/:token` | Bearer | Unregister (own devices only) |
| POST | `/enquiries` | none | Submit a lead/enquiry (website or app) |

### Admin (`/admin/*`, all require `Authorization: Bearer <adminAccessToken>`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/auth/login` | Email + password login |
| POST | `/admin/auth/refresh` | Rotate admin token pair |
| POST | `/admin/auth/logout` | Revoke admin refresh token |
| GET | `/admin/orders` | Search all orders (status, paymentStatus, dateFrom/To, search) |
| GET | `/admin/orders/:id` | Full order detail incl. `statusHistory` |
| PATCH | `/admin/orders/:id/status` | Transition status (state-machine enforced) |
| PATCH | `/admin/orders/:id/payment` | Set `UNPAID`/`PAID`/`REFUNDED` |
| GET | `/admin/products` | Search products, including inactive |
| GET | `/admin/products/:id` | One product, including inactive |
| POST | `/admin/products` | Create (images must be HTTPS URLs) |
| PATCH | `/admin/products/:id` | Update fields |
| DELETE | `/admin/products/:id` | Soft-delete (`isActive=false`) |
| PATCH | `/admin/products/:id/inventory` | Set `inventoryQuantity`/`lowStockThreshold` |
| GET | `/admin/categories` | All categories, including inactive |
| GET | `/admin/categories/:id` | One category, including inactive |
| POST | `/admin/categories` | Create |
| PATCH | `/admin/categories/:id` | Update |
| DELETE | `/admin/categories/:id` | Soft-delete |
| GET | `/admin/notifications` | Admin feed (new orders, cancellations, enquiries) |
| GET | `/admin/enquiries` | Search (status, dateFrom/To, search) |
| GET | `/admin/enquiries/:id` | One enquiry, incl. `internalNote` |
| PATCH | `/admin/enquiries/:id` | Set `status` and/or `internalNote` |

---

## Worked flows

### 1. Customer OTP → login/register

Mobile is always the raw 10-digit number (`9876543210`), never `+91...` — the API normalizes
internally and always returns the raw form.

```bash
# Step 1 — request a code (purpose: LOGIN requires an existing account, REGISTER requires none)
curl -X POST $BASE/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","purpose":"REGISTER"}'
# -> { "data": { "requestId": "otp_...", "expiresInSeconds": 300, "resendAfterSeconds": 30 } }

# In production an SMS arrives. In dev (OTP_PROVIDER=dev) the code is only in the server log:
#   [dev-otp] OTP code (not actually sent)  mobile: "+919876543210"  code: "123456"

# Step 2 — verify -> short-lived, single-use verificationToken (10 min)
curl -X POST $BASE/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"requestId":"otp_...","mobile":"9876543210","otp":"123456"}'
# -> { "data": { "verificationToken": "vt_...", "expiresInSeconds": 600 } }

# Step 3a — REGISTER (new account)
curl -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"verificationToken":"vt_...","name":"Asha Verma","mobile":"9876543210","email":"asha@example.com","address":"12 MG Road","cityState":"Pune, Maharashtra"}'

# Step 3b — LOGIN (existing account) instead of register
curl -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","verificationToken":"vt_..."}'

# Both return the same shape:
# -> { "data": { "accessToken": "...", "refreshToken": "...", "user": { "id","name","mobile","email","address","cityState","companyName?" } } }
```

A `verificationToken` is bound to one `(mobile, purpose)` pair and consumed on first use — replay
returns `VERIFICATION_INVALID`.

### 2. Refresh on 401

```bash
curl -X POST $BASE/auth/refresh -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
# -> { "data": { "accessToken": "...", "refreshToken": "..." } }   (both rotated — store both)
```
Reusing the *old* refresh token after this returns `401 TOKEN_INVALID`.

### 3. Placing an order

Only `productId` + `quantity` matter — send anything else (`price`, `name`, `total`, `customer`)
and it's silently dropped before it ever reaches business logic. The server always recomputes
from live product data and the authenticated user's profile.

```bash
curl -X POST $BASE/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: <any-unique-string-per-attempt>" \
  -d '{"lines":[{"productId":"panel-mono-330","quantity":2}]}'
# -> 201 { "data": { "id": "SSAP-20260831-R4RQ", "lines":[...], "subtotal":..., "total":...,
#                     "status":"PENDING", "paymentStatus":"UNPAID", "customer":{...} } }
```
Retry the exact same request (same `Idempotency-Key`, same user) any number of times — you get
back the same order, stock is only decremented once.

### 4. Admin order lifecycle

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
   └──────────┴─────────────┴──────────────▶ CANCELLED   (from PENDING/CONFIRMED/PROCESSING only)
```
Any other transition (e.g. `PENDING` → `DELIVERED`, or moving a `DELIVERED` order anywhere) is
rejected with `409 INVALID_STATUS_TRANSITION`. Cancelling via this route restocks inventory the
same way a customer cancel does.

```bash
curl -X PATCH $BASE/admin/orders/SSAP-20260831-R4RQ/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED","note":"Payment verified offline"}'

curl -X PATCH $BASE/admin/orders/SSAP-20260831-R4RQ/payment \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"paymentStatus":"PAID"}'
```
`paymentStatus` is independent of `status` — set it any time, in any order.

---

## Enums (exact wire values — case-sensitive)

```
OrderStatus    = PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED
PaymentStatus  = UNPAID | PAID | REFUNDED
StockStatus    = IN_STOCK | LOW_STOCK | OUT_OF_STOCK   (derived, read-only)
EnquiryStatus  = NEW | CONTACTED | CLOSED
EnquirySource  = WEB | APP
```
