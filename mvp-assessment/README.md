# BD Tourist Guide — Assessment MVP

A standalone React + TypeScript and FastAPI application. It lives in `mvp-assessment/`; the existing Express/vanilla JS project at the repository root is not part of this MVP and is left unchanged.

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ and npm

## Run the backend locally

From the `mvp-assessment` directory, create and activate a virtual environment, install the backend dependencies, then start Uvicorn:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive docs are at `http://127.0.0.1:8000/docs`. SQLite creates `destinations.db` in the current working directory by default. Set `DATABASE_URL` to change the database location. Set comma-separated `CORS_ORIGINS` if the browser frontend will call the backend directly from a different origin. With the provided Vite proxy, the browser talks to Vite and no extra local CORS origin is needed.

## Run the React frontend locally

In a second terminal, from `mvp-assessment/frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Its `/api` proxy forwards requests to the backend on port 8000, so start the backend first.

To build the frontend for production:

```powershell
npm run build
```

## API endpoints

All endpoints use the `/api/destinations` base path and JSON bodies.

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| POST | `/api/destinations` | Create a destination | `201`, created destination |
| GET | `/api/destinations/{id}` | Read one destination | `200`, destination; `404` if missing |
| GET | `/api/destinations` | List all destinations | `200`, array |
| PUT | `/api/destinations/{id}` | Replace a destination | `200`, updated destination; `404` if missing |
| DELETE | `/api/destinations/{id}` | Delete a destination | `204`; `404` if missing |

Destination JSON fields: `name`, `description`, `location`, and optional `image_url`. The database-generated `id` is returned by reads and writes. Pydantic validates request fields; invalid payloads return `422`.

## Deploy to Vercel

The root `vercel.json` defines two Vercel services: Vite frontend and FastAPI backend. Requests beginning `/api/` route to FastAPI; all other paths route to the React frontend. Select the `mvp-assessment` directory as the Vercel project root when importing this repository.

SQLite is suitable for local assessment work. Vercel serverless filesystems are ephemeral, so SQLite writes may not persist across function instances or deployments. Use a hosted database if deployment data needs durable storage; set `DATABASE_URL` accordingly.
