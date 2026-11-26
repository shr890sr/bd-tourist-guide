# CSE309 Final Project Report

## BD Tourist Guide

**Project type:** Full-stack web application MVP  
**Course:** CSE309  
**Prepared:** November 2026

BD Tourist Guide is a web application for discovering and maintaining information about tourist destinations in Bangladesh. This report describes the product requirements, software requirements, and technical design for the project MVP.

## PRD (Product Requirements Document)

### 1. Product overview

The product gives visitors a searchable catalog of Bangladesh destinations and gives registered users a way to contribute and maintain destination records. Administrators have a separate interface for managing user access. The MVP emphasizes a clear destination discovery experience, validated data, and access controls around changes.

### 2. Problem and opportunity

Travel information can be scattered across many sources, making it harder to discover places and find basic destination details in one place. A shared, structured guide can make browsing simpler and let a community contribute useful entries while preserving accountability for edits.

### 3. Goals

- Provide a responsive, approachable interface for exploring destinations.
- Let users search destination names, locations, and descriptions.
- Allow authenticated contributors to add destinations and maintain their own records.
- Give administrators oversight of users and the ability to restrict banned accounts.
- Store destination and account data in a relational database that can use Supabase PostgreSQL.
- Deploy the web application and API through Vercel.

### 4. Users and roles

| Role | Needs and permissions |
|---|---|
| Visitor | Browse and search the public destination catalog; register or sign in. |
| Registered user | Create destinations and update or delete destinations they own. |
| Administrator | Use the admin dashboard to review users and toggle bans; also manage destination records. |

### 5. MVP scope

**Included:** public destination listing and detail, text search, destination create/read/update/delete, account registration and login, authenticated ownership, admin user listing and ban controls, and deployment configuration for Vercel.

**Outside this MVP:** booking and payment flows, travel itinerary planning, ratings and reviews, maps and geolocation, multilingual content, and moderation workflows beyond the available administrator controls.

### 6. Success criteria

- Visitors can find a destination by matching text in its name, location, or description.
- Invalid destination data is rejected with a useful validation response.
- A signed-in user can create a record and later edit or remove their own record.
- A user cannot modify another user’s destination unless that user has the administrator role.
- Administrators can view accounts and ban or unban eligible users.
- The frontend and API can be deployed and configured to use the same hosted PostgreSQL database.

### 7. Assumptions and constraints

- The first release focuses on destinations within Bangladesh.
- Users provide accurate destination descriptions and image links.
- Supabase provides managed PostgreSQL; the API connects through a server-side `DATABASE_URL`.
- Vercel serves the frontend and FastAPI API using the project deployment configuration. Production environment variables and database connectivity must be configured in the deployment environment.

## SRS (Software Requirements Specification)

### 1. System context

The system consists of a React single-page application, a FastAPI JSON API, and a PostgreSQL relational database hosted by Supabase in the intended deployed configuration. The browser communicates with the API over HTTPS. The API validates input, applies authentication and authorization rules, and reads or writes records through SQLAlchemy.

### 2. Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall display a public list of destinations with name, location, description, and optional image URL. |
| FR-02 | The system shall allow a visitor to filter the visible destination list by text in the name, location, or description. |
| FR-03 | The system shall return an individual destination by its identifier and report not found when it does not exist. |
| FR-04 | The system shall register an account using a unique, valid email address and a password of at least eight characters. |
| FR-05 | The system shall authenticate registered users and issue a signed JWT access token with a limited lifetime. |
| FR-06 | The system shall require authentication to create a destination and assign ownership from the authenticated account. |
| FR-07 | The system shall allow a destination owner or administrator to update or delete that destination. Other users shall receive a forbidden response. |
| FR-08 | The system shall provide administrators with a list of user accounts without exposing password hashes. |
| FR-09 | The system shall allow an administrator to ban or unban eligible users. Banned users shall not be able to authenticate or use protected functions. |
| FR-10 | The system shall expose a health endpoint and API documentation endpoints for operational checks and developer use. |

### 3. Data requirements

**User:** integer identifier, unique email, password hash, role, banned status, and account creation timestamp.

**Destination:** integer identifier, name, description, location, optional image URL, and nullable owner identifier. Nullable ownership supports older records created before ownership tracking was added.

The database shall enforce required fields and unique user emails. The API shall validate field lengths and URL/email formats before persistence. Passwords are stored as one-way bcrypt hashes; plaintext passwords are not stored or returned.

### 4. Interface requirements

- The browser UI shall provide home/discovery, login, registration, user dashboard, and administrator dashboard routes.
- Protected pages shall redirect unauthenticated users to login. The API shall independently enforce authorization on every protected operation.
- The API shall use JSON request and response bodies under the `/api` prefix.
- Authentication credentials shall be sent as bearer tokens in the `Authorization` header.
- The API shall use standard HTTP status codes, including `201` for creation, `401` for invalid authentication, `403` for insufficient permission, `404` for missing records, `409` for duplicate registration, `422` for invalid input, and `204` for successful deletion.

### 5. Non-functional requirements

- **Security:** Hash passwords, sign and verify JWTs, check roles and ownership server-side, and avoid returning credential hashes.
- **Reliability:** Use database transactions for writes and return explicit errors for invalid or missing resources.
- **Usability:** Present clear loading, empty, success, and error states and provide a search control for discovery.
- **Maintainability:** Keep the frontend, API routers, schemas, authentication helpers, and persistence models in separate modules.
- **Portability:** Configure the database through environment variables and support PostgreSQL connection URLs for Supabase.
- **Deployment:** Build the frontend for Vercel and expose the FastAPI backend through Vercel's Python runtime configuration.

### 6. Security and access rules

Registration assigns the default user role; public requests cannot select or elevate their role. JWT claims identify the account and token expiry. Protected API handlers reload the account from the database and reject missing or banned users. Administrator-only routes require the administrator role. Destination writes compare the authenticated database user with the stored owner, with administrator access as an override.

## TDD (Technical Design Document)

### 1. Architecture

The application uses a three-layer architecture:

1. **Presentation:** React and TypeScript provide routed pages, destination components, and authentication state in the browser.
2. **API and application logic:** FastAPI provides REST endpoints, Pydantic request/response validation, authentication dependencies, and role/ownership checks.
3. **Persistence:** SQLAlchemy maps users and destinations to relational tables in PostgreSQL. Supabase hosts the production PostgreSQL database and supplies its connection URL to the API.

### 2. Technology stack

| Area | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, React Router, Axios |
| Backend | Python FastAPI, Pydantic, SQLAlchemy |
| Database | Supabase (PostgreSQL) |
| Authentication | JWT bearer access tokens; bcrypt password hashing |
| Authorization | RBAC (Role-Based Access Control), with destination ownership checks |
| Deployment | Vercel for the frontend and FastAPI API |

### 3. Main components

- **React application:** `App` declares application routes; authentication context stores the current session and provides login/register flows. Destination components render lists, details, and forms; dashboards provide user and administrator views.
- **API client:** Axios sends JSON requests to the API and adds the current bearer token to requests. The API base URL is configurable for local and deployed environments.
- **FastAPI application:** Registers authentication, destination, admin, and health routes beneath `/api`; configures CORS and OpenAPI documentation.
- **Authentication module:** Hashes and verifies passwords, creates expiring JWTs, resolves the current database user, and supplies an administrator dependency.
- **Schemas and models:** Pydantic validates API payloads and response shapes; SQLAlchemy models represent users and destinations.
- **Database module:** Reads `DATABASE_URL`, creates the SQLAlchemy engine and session factory, and provides request-scoped sessions.
- **Deployment configuration:** Vercel builds the Vite frontend and routes API requests to the Python backend. Runtime settings, including `DATABASE_URL` and `JWT_SECRET_KEY`, are supplied as environment variables.

### 4. API design

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a user account and return an access token. |
| POST | `/api/auth/login` | Public | Authenticate and return an access token. |
| GET | `/api/auth/me` | Authenticated | Return the current user's profile. |
| GET | `/api/destinations` | Public | List destinations. |
| GET | `/api/destinations/{id}` | Public | Read a destination. |
| POST | `/api/destinations` | Authenticated | Create a destination owned by the current user. |
| PUT | `/api/destinations/{id}` | Owner or admin | Update a destination. |
| DELETE | `/api/destinations/{id}` | Owner or admin | Delete a destination. |
| GET | `/api/admin/users` | Admin | List account profiles. |
| PUT | `/api/admin/users/{id}/ban` | Admin | Toggle an eligible user's banned status. |
| GET | `/api/health` | Public | Check API availability. |

### 5. Data model relationships

Each user can own zero or more destinations. A destination has one nullable `owner_id` referencing a user. Deleting a user sets the corresponding owner reference to null, preserving the destination record. The `role` field distinguishes regular users and administrators; `is_banned` controls access for suspended accounts.

### 6. Request flow

For a protected request, the frontend attaches the JWT as a bearer token. FastAPI verifies the signature and expiry, loads the user, and rejects invalid or banned accounts. For destination mutation, the API loads the destination and checks whether the user owns it or has the administrator role. Validated fields are then persisted through a SQLAlchemy session, and a typed response is returned to the frontend.

### 7. Configuration and deployment

The application is deployed with the `mvp-assessment` folder as the Vercel project root. The frontend build uses Vite. The API requires a secret `JWT_SECRET_KEY` and a Supabase PostgreSQL `DATABASE_URL`; these values belong in the Vercel project environment configuration and must not be committed to source control. Local development can use the same environment variable pattern with a development database and secret. Vercel's serverless environment is not suitable for durable SQLite storage, so deployed data is stored in hosted PostgreSQL.

### 8. Design limitations and future work

The MVP does not provide bookings, reviews, maps, image uploads, or advanced moderation. Future iterations could add destination categories and filters, pagination, audit history, image storage, automated database migrations, and expanded content moderation while retaining the existing API and ownership model.
