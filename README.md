# URL Shortener API

A backend API for a URL shortening service with user authentication, subscription-based quotas, and analytics.

**Built with:** NestJS · TypeScript · TypeORM · PostgreSQL

---

## Features

- User creation with auto-issued API key
- API key authentication (`x-api-key` header)
- URL shortening with unique short codes
- Quota enforcement — **FREE**: 10/month, **PRO**: 100/month
- Ownership validation on stats endpoint
- Usage tracking per user
- HTTP 302 redirect with asynchronous click tracking
- Optional URL expiration — expired codes return `410 Gone`
- Custom short codes for PRO users (6–8 alphanumeric characters)
- Click analytics for PRO users (total count + recent history)
- Rate limiting — 60 requests/minute per API key (falls back to IP)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Svet-Dovbnia/url_shortener_api
cd url_shortener_api
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure the environment

Create a `.env` file based on `.env.example`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener
```

### 4. Run the application

```bash
yarn start:dev
```

### 5. Open the Swagger UI

Available at <http://localhost:3000/docs>.

### Running with Docker

Alternatively, bring up the API and PostgreSQL together:

```bash
docker compose up --build
```

The API is available at <http://localhost:3000>, Swagger at <http://localhost:3000/docs>, and Postgres on `localhost:5432`. Shutdown with `docker compose down`; add `-v` to also drop the `pgdata` volume.

### Running tests

```bash
yarn test          # run the unit-test suite once
yarn test:watch    # re-run affected tests on change
yarn test:cov      # generate a coverage report under ./coverage
yarn test:e2e      # run end-to-end tests against a throwaway Postgres container
```

Business logic lives in the service layer; see `src/modules/user/user.service.spec.ts` and `src/modules/url/url.service.spec.ts` for the covered behavior. The e2e suite (`test/app.e2e-spec.ts`) boots the full Nest app against a real Postgres via `@testcontainers/postgresql`, so a running Docker daemon is required for `yarn test:e2e`.

---

## Authentication

All endpoints except the redirect and user creation require an API key passed via header:

```http
x-api-key: usr_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Bootstrap: `POST /user`

User creation is the bootstrap path — a new client has no API key yet, so it can't authenticate with `x-api-key`. It is guarded by a separate shared admin secret via the `x-admin-key` header:

```http
x-admin-key: <ADMIN_API_KEY>
```

- If the `ADMIN_API_KEY` environment variable is **set**, `POST /user` rejects requests without a matching `x-admin-key` header (`401 Unauthorized`).
- If `ADMIN_API_KEY` is **empty or unset**, the endpoint is open (useful for local development). The app logs a warning on startup so this is never silent.

**Set `ADMIN_API_KEY` in any non-local deployment.**

---

## API Endpoints

### User

| Method | Path            | Auth               | Description                   |
| ------ | --------------- | :----------------: | ----------------------------- |
| POST   | `/user`         | `x-admin-key`¹     | Create a new user             |
| GET    | `/user/usage`   | `x-api-key`        | Get the caller's usage stats  |

¹ Required only when `ADMIN_API_KEY` is configured; see [Authentication](#authentication).

### URL

| Method | Path                       | Auth        | Description                       |
| ------ | -------------------------- | :---------: | --------------------------------- |
| POST   | `/url/shorten`             | `x-api-key` | Shorten a URL                     |
| GET    | `/url/:shortCode/stats`    | `x-api-key` | Get URL stats (PRO only)          |
| GET    | `/:shortCode`              |      —      | Redirect (HTTP 302)               |

---

## Example requests

### Create a user

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"email": "user@example.com"}'
```

> `x-admin-key` can be omitted during local development when `ADMIN_API_KEY` is unset.

```json
{
  "id": "c0a8012e-8b1c-4e1c-9d3a-1f5b2c3d4e5f",
  "email": "user@example.com",
  "apiKey": "usr_A1b2C3d4E5f6G7h8I9j0K1l2",
  "plan": "FREE",
  "createdAt": "2026-04-19T12:00:00.000Z"
}
```

### Shorten a URL

`expiresAt` is optional; if provided it must be a future ISO-8601 timestamp. Expired codes respond with `410 Gone`. `shortCode` is optional and PRO-only — 6–8 alphanumeric characters; a taken code responds with `409 Conflict`.

```bash
curl -X POST http://localhost:3000/url/shorten \
  -H "Content-Type: application/json" \
  -H "x-api-key: usr_A1b2C3d4E5f6G7h8I9j0K1l2" \
  -d '{"originalUrl": "https://example.com/very/long/path", "expiresAt": "2026-12-31T23:59:59.000Z"}'
```

```json
{
  "id": "2f91fce7-4a9b-45f7-9a6d-6f1e5b2a3c4d",
  "shortCode": "aB3cD9eF",
  "originalUrl": "https://example.com/very/long/path",
  "createdAt": "2026-04-19T12:00:00.000Z",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "userId": "c0a8012e-8b1c-4e1c-9d3a-1f5b2c3d4e5f"
}
```

### Redirect

```bash
curl -i http://localhost:3000/aB3cD9eF
```

```http
HTTP/1.1 302 Found
Location: https://example.com/very/long/path
```

### Get caller usage

```bash
curl http://localhost:3000/user/usage \
  -H "x-api-key: usr_A1b2C3d4E5f6G7h8I9j0K1l2"
```

```json
{
  "userId": "c0a8012e-8b1c-4e1c-9d3a-1f5b2c3d4e5f",
  "plan": "FREE",
  "limit": 10,
  "usedThisMonth": 3,
  "remaining": 7,
  "resetsAt": "2026-05-01T00:00:00.000Z"
}
```

### Get URL stats (PRO only)

```bash
curl http://localhost:3000/url/aB3cD9eF/stats \
  -H "x-api-key: usr_PRO_key_here"
```

```json
{
  "shortCode": "aB3cD9eF",
  "totalClicks": 42,
  "recentClicks": [
    {
      "timestamp": "2026-04-19T12:00:00.000Z",
      "ipAddress": "203.0.113.1",
      "userAgent": "Mozilla/5.0"
    }
  ]
}
```

### Error response shape

Every non-2xx response uses the same compact shape:

```json
{ "statusCode": 404, "message": "Short URL not found" }
```

Validation errors from `class-validator` return the field-level details as a string array:

```json
{ "statusCode": 400, "message": ["originalUrl must be a URL address"] }
```

---

## Assumptions & trade-offs

- **Quota window** is the calendar month in UTC — counted from the first of the current month against `Url.createdAt`.
- **Short codes** are 8-character `nanoid` values. Collisions are possible in theory, so `shorten` retries until it finds a free code.
- **API keys** are issued on user creation (`usr_` prefix + 24-char `nanoid`) and cannot be rotated yet.
- **Redirect uses HTTP 302** rather than 301 so every hit reaches the server and can be counted. A 301 would be cached by browsers and skew analytics.
- **Click tracking is fire-and-forget** — the redirect flushes before the insert resolves, and a failing DB insert is logged but never surfaced to the client. The insert still runs in the API process, so "async" here means the *request* isn't blocked, not that analytics is on a separate worker. For real load the insert should be published to a queue (BullMQ/Kafka/SQS) and consumed out-of-band; that change stays confined to `UrlService.recordClick`.
- **Stats endpoint returns the 50 most recent clicks** — enough to be useful without paginating. Total count is always accurate.
- **Error body is always `{ statusCode, message }`** — timestamps, paths, and stack traces stay in the server log.
- `POST /user` is guarded by a shared admin secret (`ADMIN_API_KEY`) rather than a per-user API key — a new client has no key to present yet. The guard is permissive when `ADMIN_API_KEY` is unset to keep local development frictionless, and logs a warning so the open state is never silent.

---

## Current Limitations

- Click history in the stats endpoint is capped at the 50 most recent entries (no pagination)
- Rate-limit counters live in memory — they reset on restart and don't scale across multiple API instances
- No response caching for hot short codes

---

## Possible Improvements

- Add Redis caching for frequently accessed URLs
- Back the rate limiter with Redis so limits survive restarts and scale across instances
- Add asynchronous processing for analytics (e.g., message queue)
- Add bulk URL shortening endpoint
- Improve logging and monitoring

---

## Design Decisions

- Simple modular architecture to keep the codebase maintainable
- Business logic in services, controllers kept thin
- No over-engineering (no CQRS, no DDD layers)
- Database-first approach using TypeORM entities

---

## Notes

This project focuses on demonstrating:

- Clean architecture
- Proper use of NestJS patterns
- Understanding of backend fundamentals
- Ability to work with incomplete requirements and document assumptions

Further features can be added incrementally without major refactoring.
