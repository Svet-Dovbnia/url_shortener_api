URL Shortener API

Overview

This project is a backend API for a URL shortening service with user authentication, subscription-based quotas, and analytics.

Built with:

* NestJS
* TypeScript
* TypeORM
* PostgreSQL

⸻

Features

* User creation with API key
* URL shortening
* Redirect endpoint (placeholder)
* Usage tracking (partial)
* Analytics (planned)

⸻

Setup

1. Clone repository 
git clone <repo-url>
cd url-shortener
2. Install dependencies
yarn install
3. Configure environment

Create a .env file based on .env.example

Example:
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener
4. Run the application
   yarn start:dev
5. Swagger API documentation

Available at:
http://localhost:3000/api

Running Tests
yarn test

Authentication

All endpoints (except redirect) require an API key passed via header:
x-api-key: usr_xxxxxxxxxxxxxxxxx

API Endpoints

User

* POST /user — Create a new user
* GET /user/usage — Get user usage (placeholder)

URL

* POST /url/shorten — Shorten a URL
* GET /:shortCode — Redirect (mocked)
* GET /url/:shortCode/stats — Get URL stats (placeholder)

⸻

Assumptions

* Monthly quota will be calculated based on URL creation timestamp
* Short codes are generated using nanoid
* Redirect endpoint is currently mocked and will be replaced with HTTP redirect (301/302)
* Analytics tracking will be implemented asynchronously (non-blocking)
* SQLite can be used instead of PostgreSQL for local development
* API key is generated automatically during user creation

⸻

Current Limitations

* Quota enforcement is not implemented yet
* Analytics (click tracking) is not implemented yet
* API key guard is not implemented yet
* Redirect does not perform real HTTP redirect yet
* Ownership validation is not implemented yet

⸻

Possible Improvements

* Add Redis caching for frequently accessed URLs
* Implement rate limiting per API key
* Add asynchronous processing for analytics (e.g., message queue)
* Add URL expiration feature
* Allow custom short codes for PRO users
* Add bulk URL shortening endpoint
* Add Docker support (Dockerfile + docker-compose)
* Add integration (e2e) tests with test containers
* Improve logging and monitoring

⸻

Design Decisions

* Simple modular architecture to keep the codebase maintainable
* Business logic placed in services, controllers kept thin
* No over-engineering (no CQRS, no DDD layers)
* Database-first approach using TypeORM entities

⸻

Notes

This project focuses on demonstrating:

* clean architecture
* proper use of NestJS patterns
* understanding of backend fundamentals
* ability to work with incomplete requirements and document assumptions

Further features can be added incrementally without major refactoring.