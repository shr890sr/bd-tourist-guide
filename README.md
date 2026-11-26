# BD Tourist Guide - CSE309 Final Project

A secure multi-user application to manage tourist destinations in Bangladesh.

## Tech Stack
- **Frontend:** React with TypeScript, Vite, Tailwind CSS, Axios
- **Backend:** FastAPI (Python), SQLAlchemy, Pydantic
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (Access & Refresh Tokens), Bcrypt
- **Deployment:** Vercel (Frontend & Backend)

## Features
- JWT Authentication (Login, Register, Refresh Token, Logout)
- Role-Based Access Control (RBAC) - Admin vs User
- Admin Dashboard (User Management, Activity Logs, Ban/Unban)
- CRUD operations for Destinations
- Groups/Teams with shared permissions
- Profile Update & Password Change
- Audit Logging (tracks login, ban, delete actions)

## Live Deployments
- **Frontend:** https://bd-tourist-guide-mvp-assessment.vercel.app/
- **Backend API:** https://bd-tourist-guide-backend.vercel.app/api
- **API Docs:** https://bd-tourist-guide-backend.vercel.app/api/docs

## Test Accounts
- **Admin:** admin@test.com / Password123
- **User:** user@test.com / Password123
