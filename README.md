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
- Redirect endpoint (placeholder)
- Analytics (planned)

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

### Running tests

```bash
yarn test
```

---

## Authentication

All endpoints except the redirect require an API key passed via header:

```http
x-api-key: usr_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## API Endpoints

### User

| Method | Path            | Auth | Description                   |
| ------ | --------------- | :--: | ----------------------------- |
| POST   | `/user`         |  —   | Create a new user             |
| GET    | `/user/usage`   |  ✓   | Get user usage (placeholder)  |

### URL

| Method | Path                       | Auth | Description                       |
| ------ | -------------------------- | :--: | --------------------------------- |
| POST   | `/url/shorten`             |  ✓   | Shorten a URL                     |
| GET    | `/url/:shortCode/stats`    |  ✓   | Get URL stats (PRO, placeholder)  |
| GET    | `/:shortCode`              |  —   | Redirect (mocked)                 |

---

## Assumptions

- Monthly quota is calculated from URL creation timestamps
- Short codes are generated using `nanoid`
- Redirect endpoint is currently mocked and will be replaced with an HTTP redirect (301/302)
- Analytics tracking will be implemented asynchronously (non-blocking)
- SQLite can be used instead of PostgreSQL for local development
- API key is generated automatically during user creation

---

## Current Limitations

- Analytics (click tracking) is not implemented yet
- Redirect does not perform a real HTTP redirect yet (mocked)

---

## Possible Improvements

- Add Redis caching for frequently accessed URLs
- Implement rate limiting per API key
- Add asynchronous processing for analytics (e.g., message queue)
- Add URL expiration
- Allow custom short codes for PRO users
- Add bulk URL shortening endpoint
- Add Docker support (Dockerfile + docker-compose)
- Add integration (e2e) tests with test containers
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
