# bd-tourist-guide
# BD Tourist Guide

A minimal starting point for rebuilding the BD Tourist Guide website. The frontend uses plain HTML, CSS, and JavaScript. The local server uses Express and SQLite.

## Requirements

- Node.js 22.5 or newer (Node.js 24 is recommended)
- npm

SQLite uses Node.js's built-in `node:sqlite` module, so native build tools are not required.
The `node:sqlite` module was added in Node.js 22.5. On Node.js 22.5 through 22.12, start the server with `node --experimental-sqlite backend/server.js`; Node.js 22.13 and newer can use `npm start` directly.

## Run locally

1. Open a terminal in the project folder.
2. Install dependencies with `npm install`.
3. Optionally copy `.env.example` to `.env` to set a different `PORT`.
4. Start the server with `npm start` (Node.js 22.13 or newer). On Node.js 22.5 through 22.12, use `node --experimental-sqlite backend/server.js` instead.
5. Visit `http://localhost:3000`.

The SQLite database is created automatically at `backend/data/tourist.sqlite` when the server starts.

## Project structure

```text
index.html
css/style.css
js/main.js
assets/images/
backend/server.js
backend/db.js
backend/data/
```
