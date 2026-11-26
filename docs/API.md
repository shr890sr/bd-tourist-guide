# BD Tourist Guide API

Base URL: `/api`. JSON request and response bodies use UTF-8. Protected requests use `Authorization: Bearer <token>`. Paginated collections accept `page` and `limit` (maximum 100) and return `{ "data": [], "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 } }`. Errors return `{ "error": { "code": "...", "message": "..." } }`.

## Frontend connection examples

For the bundled frontend served by the backend, use `http://127.0.0.1:3000/api` as the API base. For a separately hosted frontend, set `WEB_ORIGIN` in the backend environment to the frontend's exact origin (scheme, host, and port, with no path), then use `http://127.0.0.1:3000/api` locally or the deployed backend origin plus `/api`. The backend allows same-origin requests by default. Cross-origin browser requests are allowed only from the exact configured `WEB_ORIGIN`; bearer tokens are sent in the `Authorization` header, so cookie credentials are not used.

Register or log in with JSON:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"traveler@example.com","password":"your-password"}
```

Successful login returns the public user and bearer token (example values shown):

```json
{"user":{"id":12,"fullName":"A Traveler","email":"traveler@example.com","phone":null,"role":"tourist","createdAt":"2026-01-01 10:00:00"},"token":"<bearer-token>"}
```

Keep the token in the frontend session and attach it only to protected requests:

```http
GET /api/bookings/mine
Authorization: Bearer <bearer-token>
```

Public destination reads need no token. Example list response:

```json
{"data":[{"id":1,"name":"Cox's Bazar","description":"...","location":"Chattogram Division","imageUrl":"https://example.test/image.jpg","category":"Coast","averageRating":null,"reviewCount":0}],"pagination":{"page":1,"limit":12,"total":1,"totalPages":1}}
```

Create a booking as a signed-in tourist with IDs returned by the guide and destination endpoints:

```http
POST /api/bookings
Authorization: Bearer <bearer-token>
Content-Type: application/json

{"guideId":3,"destinationId":1,"travelDate":"2027-01-15","requestDetails":"Please show me the old town."}
```

Created resources return HTTP `201` and usually a `{ "data": ... }` object. Failures use a consistent body and an appropriate HTTP status, for example:

```json
{"error":{"code":"authentication_required","message":"Sign in to access this resource."}}
```

Use `GET /api/health` for a lightweight connectivity check. Configure the backend `PORT`, `HOST`, `DATABASE_PATH`, and `AUTH_SECRET` through its environment; do not put `AUTH_SECRET` in frontend configuration. Registration and login return `503` until a secret of at least 32 characters is configured.

## Health and accounts

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health status |
| POST | `/auth/register` | Public, rate limited | Register `{ fullName, email, password, phone? }`; password minimum 10 characters |
| POST | `/auth/login` | Public, rate limited | Login `{ email, password }` |
| POST | `/auth/logout` | Signed in | Revoke current account tokens |
| GET | `/auth/me` | Signed in | Read own public profile |
| PATCH | `/auth/me` | Signed in | Update own `{ fullName?, phone? }` |

Registration/login return `{ user, token }`. Password hashes and token secrets are never returned.

## Destinations

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/destinations?search=&location=&category=&page=&limit=` | Public | Search/filter destinations and ratings |
| GET | `/destinations/:id` | Public | Destination details and rating summary |
| POST | `/destinations` | Admin | Create `{ name, description, location, imageUrl?, category? }` |
| PATCH | `/destinations/:id` | Admin | Update supplied destination fields |
| DELETE | `/destinations/:id` | Admin | Delete when no booking/review references it; otherwise `409` |

## Guides

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/guides?search=&location=&language=&type=&page=&limit=` | Public | List approved guides on active accounts |
| GET | `/guides/:id` | Public | Approved guide details and rating |
| POST | `/guides/me` | Signed in | Create a pending profile `{ location, languages: [], introduction, guideType? }` |
| GET | `/guides/me` | Signed in | Read own guide profile and approval status |
| PATCH | `/guides/me` | Signed in | Update own guide profile fields |
| PATCH | `/guides/:id/approval` | Admin | Set `{ status: "approved" | "rejected" | "pending" }` |

Guide types: `volunteer`, `paid`, `both`. `availability` is an optional list of available `YYYY-MM-DD` dates; when non-empty, booking creation and acceptance require the requested date to be listed. Only approved profiles on active accounts are public. Volunteer application approval automatically creates/promotes the guide profile.

## Hiring requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/bookings` | Tourist | Submit `{ guideId, destinationId, travelDate: "YYYY-MM-DD", requestDetails }` |
| GET | `/bookings/mine` | Tourist | List own requests |
| GET | `/bookings/incoming` | Guide | List requests for own guide profile |
| GET | `/bookings/:id` | Owner/admin | Read an authorized request |
| PATCH | `/bookings/:id/status` | Request owner | Change an allowed status |

Allowed transitions: tourist cancels `pending` or `accepted`; guide accepts/rejects `pending` and completes `accepted`. Acceptance checks for another accepted booking for that guide/date. New requests are `pending`; no payment or instant confirmation is implied.

## Reviews

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/reviews?guideId=&destinationId=&page=&limit=` | Public | List recent reviews, optionally for one target, and average rating |
| POST | `/reviews` | Signed in | Submit `{ guideId }` or `{ destinationId }`, plus `{ rating: 1..5, comment }` |
| PATCH | `/reviews/:id` | Author/admin | Update rating and/or comment |
| DELETE | `/reviews/:id` | Author/admin | Delete review |

Exactly one review target is required. A guide review requires the author to have a completed booking with that guide. One review per user per target is allowed. Destination reviews require sign-in.

## Volunteer applications and administration

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/applications` | Signed in | Submit `{ introduction, location, languages: [], experience? }` |
| GET | `/applications/me` | Signed in | Read own application and status |
| GET | `/applications?status=pending` | Admin | List applications, optionally filtered by status |
| PATCH | `/applications/:id/decision` | Admin | Decide `{ status: "approved" | "rejected", decision? }`; approval is transactional and promotes the applicant |
| GET | `/admin/users?page=&limit=` | Admin | Paginated user list (never includes hashes) |
| PATCH | `/admin/users/:id/status` | Admin | Set `{ status: "active" | "suspended" }`, revoking existing tokens |
| GET | `/admin/overview` | Admin | Aggregate counts |

## Status codes

`200` success, `201` created, `204` deleted, `400` invalid input/JSON, `401` missing or invalid login, `403` insufficient permission, `404` missing record/route, `409` conflict or invalid transition, `429` rate limited, `500` unexpected server error, and `503` authentication secret is not configured. Internal errors are logged server-side and returned without stack traces.
