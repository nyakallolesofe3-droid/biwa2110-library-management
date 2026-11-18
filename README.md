# BIWA2110 Library Management System

A full-stack library management app for the Web Application Development lab test. It includes a React frontend and an Express API backed by a separate PostgreSQL server.

## Requirements

- Node.js 18+
- A PostgreSQL database, hosted (for example Neon) or local

## Setup

1. Create a PostgreSQL database. For Neon, create a project and copy its connection string from **Connect**.
2. Copy `backend/.env.example` to `backend/.env`. Put the full string in `DATABASE_URL=...`, keep Neon’s `sslmode=require` option, and replace `SESSION_SECRET` and `DEFAULT_ADMIN_PASSWORD` with private values. Do not commit `.env`.
3. In a VS Code terminal opened in `backend/`, run `npm install` then `npm run dev`.
4. In a second terminal opened in `frontend/`, run `npm install` then `npm run dev`.
5. Open the Vite URL (usually http://localhost:5173). The API listens on port 4000.

The API creates or migrates the required tables automatically when it connects. Inspect hosted Neon data in the Neon SQL Editor, or connect pgAdmin to the same database. Useful queries include `SELECT * FROM books;`, `SELECT * FROM users;`, and `SELECT * FROM transactions;`.

The initial administrator is `ADMIN001` with password `Library@2026!` unless `DEFAULT_ADMIN_PASSWORD` is set before first startup. Change it after first sign-in. Passwords are stored as salted hashes. Administrator access is required for book changes, user management, and transaction editing/deletion. Members can sign in with a membership ID and password and can record borrowings. Their transaction history is scoped to their account.

## Features

- Dashboard with inventory totals, low-stock alerts, and recent transactions.
- Book create, edit, delete, search, and low-stock highlighting.
- Stock-in and borrowing transactions with quantity validation and transaction history.
- User create, edit, delete, and membership-ID login.
- Responsive layout and client-side form validation.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/books` | List books; administrator creates |
| GET, PUT, DELETE | `/books/:id` | Read a book; administrator updates/deletes |
| GET, POST | `/transactions` | Signed-in history; record stock movements |
| GET, PUT, DELETE | `/transactions/:id` | Read; administrator updates/deletes with stock reversal |
| GET, POST | `/users` | Administrator lists and creates users |
| GET, PUT, DELETE | `/users/:id` | Administrator reads, updates, and deletes users |
| POST | `/auth/login` | Sign in with membership ID and password |
| GET | `/auth/me` | Get the signed-in user |
| GET | `/health` | API health check |

For GitHub submission, create a repository and upload this `outputs` folder's contents as the repository root.
