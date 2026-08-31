# Mobile App Integration Guide

For whoever's wiring the SSAP Solar app (Expo / React Native — runs on Android and iOS from one
codebase, not a native Android/Kotlin project) up to this backend.

The app was built **mock-first** behind a repository abstraction
(`AuthRepository` / `ProductRepository` / `OrderRepository` in `src/features/*/api/`), currently
backed by `Mock*Repository` implementations. Integrating means writing `Api*Repository`
implementations of the *same interfaces* and swapping them in at `src/services/repositories.ts` —
every screen, hook, and store is written against the interface and needs zero changes.

```ts
// src/services/repositories.ts — the one file that changes
export const authRepository: AuthRepository = config.useMock
  ? new MockAuthRepository()
  : new ApiAuthRepository(httpClient);
// ...same pattern for productRepository, orderRepository
```

## 1. Configuration

```bash
# .env (Expo)
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1   # or your deployed URL
EXPO_PUBLIC_USE_MOCK=false
```
`config.apiBaseUrl` and `config.useMock` already exist in `src/constants/config.ts` — they're just
not consumed by `repositories.ts` yet. That branch is the net-new work.

On a physical Android device or emulator, `localhost` means the device itself, not your dev
machine — use your machine's LAN IP (`http://192.168.x.x:4000/api/v1`) or `10.0.2.2` for the
Android emulator specifically.

## 2. HTTP client (net new — doesn't exist yet)

Nothing like this exists in the app today (`src/services/` has no `http` folder). You need:

1. A base client that attaches `Authorization: Bearer <accessToken>` to every request.
2. Secure token storage (`expo-secure-store`, not plain AsyncStorage — these are auth tokens).
3. A 401-triggered refresh: on `TOKEN_EXPIRED`, call `POST /auth/refresh` once, retry the original
   request with the new access token; on refresh failure, clear tokens and route to login.

```ts
// sketch — not prescriptive about your HTTP library (fetch/axios/ky all work)
async function request(path: string, init: RequestInit, retried = false): Promise<Response> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: { ...init.headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  });

  if (res.status === 401 && !retried) {
    const body = await res.clone().json().catch(() => null);
    if (body?.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefresh(); // POST /auth/refresh, store new pair
      if (refreshed) return request(path, init, true);
    }
    await clearTokens(); // TOKEN_INVALID, or refresh itself failed -> force re-login
  }
  return res;
}
```

Store **both** tokens from every login/register/refresh response — the refresh token rotates on
every use, so the old one stops working immediately.

## 3. Repository → endpoint mapping

Every method on the three interfaces maps to exactly one endpoint. Where the interface's return
type doesn't match the API response 1:1, the adapter does the small translation described below.

| Interface method | Endpoint | Adapter notes |
|---|---|---|
| `AuthRepository.requestOtp(mobile)` | `POST /auth/otp/request` | Unwrap `data`, return `{requestId}` |
| `AuthRepository.verifyOtp({mobile,otp,requestId})` | `POST /auth/otp/verify` | Method returns `void` to the app — stash the response's `verificationToken` in memory, keyed by `requestId`, for the next call |
| `AuthRepository.login(mobile)` | `POST /auth/login` | Send the stashed `verificationToken`; store both tokens; return `user` |
| `AuthRepository.register(input)` | `POST /auth/register` | Send `input` + stashed `verificationToken`; store both tokens; return `user` |
| `AuthRepository.updateProfile(userId, input)` | `PATCH /users/me` | User is derived from the bearer token server-side — the `userId` arg is unused by the adapter |
| `ProductRepository.getCategories()` | `GET /categories` | Unwrap `data` |
| `ProductRepository.getProducts(query)` | `GET /products?...` | Map `query.inStockOnly` → `?inStock=`; drop `sort: 'none'` entirely (server default is unsorted); unwrap `data` from the **paginated** envelope — use a large `pageSize` (e.g. 100) for now since the app doesn't paginate yet |
| `ProductRepository.getProduct(id)` | `GET /products/:id` | `404` → return `null` |
| `OrderRepository.getOrders()` | `GET /orders` | Already newest-first; unwrap `data` |
| `OrderRepository.getOrder(id)` | `GET /orders/:id` | `404` → return `null` |
| `OrderRepository.createOrder(input)` | `POST /orders` | **Only send `{lines:[{productId,quantity}]}`** — drop `price`/`name`/`total`/`customer` from the app's `CreateOrderInput` entirely, the server recomputes all of it. Send an `Idempotency-Key` header (reuse `generateId()` from `src/utils/id.ts` per submit-tap, not per retry) |
| `OrderRepository.cancelOrder(id)` | `POST /orders/:id/cancel` | Returns the updated order |

`mobile` is always the raw 10-digit string on both sides of the wire — the API never expects or
returns a `+91` prefix, matching what the app already does everywhere.

## 4. Error handling

Every non-2xx response is `{ "error": { "code", "message", "details?", "requestId", "timestamp" } }`.
`message` is written to be shown to a user directly — it's exactly what `AuthError`/`OrderError`
already carry as `.message` in the mock implementations, so existing UI that does
`catch (err) { showError(err.message) }` needs no changes. If you want code-specific branching
(e.g. distinguishing `INSUFFICIENT_STOCK` to highlight a specific cart line), switch on
`error.code` — see [`API_REFERENCE.md`](./API_REFERENCE.md) for the full code list.

## 5. Push notifications (new capability — the mocks never had this)

1. After login/register succeeds, get an Expo push token (`Notifications.getExpoPushTokenAsync()`)
   and `POST /devices` with `{ expoPushToken, platform: 'ios' | 'android' }`.
2. On logout, `DELETE /devices/:token` (URL-encode the token — it contains brackets) *before*
   calling `/auth/logout`, using the same access token.
3. That's it — the server pushes on order placed/cancelled/status-changed/payment-changed with
   copy matching `strings.notifications` already in the app (`orderPlacedTitle`,
   `orderPlacedBody(orderId)`, etc.) for the events the mock already covered locally via
   `notifyLocal()`. You can remove those local-notification calls once server push is live —
   redundant otherwise.

## 6. What's genuinely new vs. what the mock already modeled

The backend's `Order` includes `subtotal` and the admin API exposes `statusHistory` — neither is
on the app's current `Order` type. They're additive fields the adapter can just ignore for now (no
screen needs them yet); nothing about existing types needs to change to integrate.

## 7. Suggested integration order

1. `ApiAuthRepository` + the http client + token storage — get login/register working end-to-end
   first, since everything else needs a valid session (catalogue reads are auth-optional, but you
   need the client plumbing built regardless).
2. `ApiProductRepository` — catalogue is read-only and has no auth edge cases, good second step.
3. `ApiOrderRepository` — depends on the http client's auth header being solid.
4. Device push registration, wired into the existing login/logout flow.
5. Flip `EXPO_PUBLIC_USE_MOCK=false`, remove the mock imports once you're confident.

Test against a real running backend as you go — see [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for
how to stand it up locally (`docker compose up -d && npm run seed && npm run dev`).
