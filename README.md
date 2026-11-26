# BD Tourist Guide

Express and Node.js 24 backend with SQLite (`node:sqlite`) and a plain HTML/CSS/JavaScript frontend served by the same origin.

## Install and run

Requirements: Node.js 22.13+ (24 recommended) and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Set `AUTH_SECRET` in `.env` to a private random value of at least 32 characters. For example, generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Never commit `.env`.

```powershell
npm.cmd start
```

Open `http://127.0.0.1:3000`. The database is created at `backend/data/tourist.sqlite`; the schema is migrated additively when the server starts. Migration 2 copies the six destination entries already present in the frontend into an empty catalog using `INSERT OR IGNORE`; it does not update or delete existing destination records. API health check: `GET /api/health`.

For the existing VS Code Live Server URL `http://127.0.0.1:5500/Tourist/index.html`, set `WEB_ORIGIN=http://127.0.0.1:5500` in `.env` and run the backend on port 3000. The frontend detects Live Server on port 5500 and calls the backend at `http://127.0.0.1:3000/api`. For any other static host, configure its exact origin in `WEB_ORIGIN` and set the frontend API base accordingly.

Create the first administrator with a strong temporary password in the environment. This command writes a password hash only:

```powershell
$env:ADMIN_INITIAL_PASSWORD = 'use-a-unique-password-at-least-10-characters'
node backend/create-admin.js admin@example.com 'Site Administrator'
Remove-Item Env:ADMIN_INITIAL_PASSWORD
```

Run the automated integration tests against an in-memory database:

```powershell
npm.cmd test
```

## Configuration

See `.env.example`. `PORT` defaults to `3000`, `HOST` to `127.0.0.1`, `DATABASE_PATH` to `backend/data/tourist.sqlite`, `WEB_ORIGIN` is optional for a separately hosted frontend, `AUTH_SECRET` is required for login and registration, and `API_RATE_LIMIT` sets the general per-IP request limit. `TRUST_PROXY=true` should only be set when the server is behind a correctly configured trusted proxy.

## Backend layout

- `backend/app.js`: Express setup, static serving, CORS, and error handling.
- `backend/db.js`: SQLite connection, schema and additive migrations.
- `backend/routes/`: endpoint modules by domain.
- `backend/middleware/`: bearer authentication, role checks, and rate limiting.
- `backend/security.js`: `scrypt` password hashing and signed expiring bearer tokens.
- `backend/validation.js`: request validation.
- `backend/services/serializers.js`: public response shaping.
- `backend/create-admin.js`: explicit initial administrator creation.
- `tests/backend.test.js`: API integration test using temporary in-memory SQLite.
- `docs/API.md`: endpoint and payload reference.

## Authentication and current limits

Register and login return a bearer token. Send it as `Authorization: Bearer <token>`. Tokens expire after 12 hours; logout revokes all current tokens for that account. Roles are `tourist`, `guide`, and `admin`. Registration always creates a tourist account; volunteer approval promotes the account to guide. Admin privileges cannot be self-selected.

Password reset/email verification and payment processing are not implemented. Profile image upload is not supported; guide image URLs are not currently part of the guide schema. Guide reviews require a completed booking; destination reviews require an account. Admin endpoints require an administrator created by the CLI. No guide, review, user, or booking seed data is created.

The frontend destination search, guide directory, registration/login, hiring requests, guide reviews, volunteer application, and request status panel call the API. It uses `sessionStorage` for the bearer token; a production deployment should consider a same-site, secure, HTTP-only cookie session and HTTPS.
