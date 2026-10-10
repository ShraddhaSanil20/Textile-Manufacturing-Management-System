# Textile Manufacturing Management System

**Everest Textile Mills** · *Build One System to Replace Notebooks and Phone Calls*

An integrated ERP and Manufacturing Execution System (MES) that digitizes textile mill operations. It connects inventory, production, quality inspection, dispatch, finance, workforce management and buyer order tracking, reducing paperwork and giving real-time visibility into the factory.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Demo Accounts](#demo-accounts)
5. [Setup (Windows)](#setup-windows)
6. [Demo Workflow](#demo-workflow)
7. [Testing and API](#testing-and-api)


---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Charts and icons | Recharts 2, Lucide React |
| Backend | Python, FastAPI, Pydantic v2 |
| ORM and migrations | SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 16 |
| Security | bcrypt, PyJWT, role-based access control (RBAC) |

## Architecture

```
React + Vite (port 5173)
        |
   REST API + JWT
        |
FastAPI (port 8000)
        |
PostgreSQL (port 5433)
```

## Core Features

| Module | What it does |
| --- | --- |
| Inventory and orders | Track raw materials, yarn, finished goods and buyer orders |
| Production | Manage spinning, weaving, batches, machine output and downtime |
| Quality control | Inspect fabric rolls with the four-point system; classify as pass, rework or reject |
| Dispatch | Track shipments, deduct inventory, generate delivery challans and invoices |
| Finance and workforce | Manage expenses, wages, payroll, payments and margins |
| Buyers and users | Track order progress and enforce role-based access |

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@everest.test` | `Admin@123` |
| Store Manager | `store@everest.test` | `Store@123` |
| Production Operator | `production@everest.test` | `Prod@123` |
| Quality Inspector | `quality@everest.test` | `Quality@123` |
| Accounts Officer | `accounts@everest.test` | `Accounts@123` |
| Fabric Buyer | `buyer@everest.test` | `Buyer@123` |

> Demo credentials are for local prototype testing only. Do not use them in a public deployment.

---

## Setup (Windows)

**Prerequisites:** Python 3.11+, Node.js 18+, npm, Docker Desktop.

Each step below opens its own terminal. Keep the backend and frontend terminals running while you use the app.

### Step 1: Start PostgreSQL

**TERMINAL** (project root)

```powershell
docker compose up -d
docker compose ps
```

Database settings: `textile_db` · user `textile_user` · password `textile_pass` · port `5433`.

### Step 2: Set up and start the backend

**TERMINAL** (new terminal, from the project root)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

**FILE:** `backend/.env` (copy it from `backend/.env.example`, then set these values)

```
DATABASE_URL=postgresql://textile_user:textile_pass@127.0.0.1:5433/textile_db
SECRET_KEY=replace-with-a-long-random-secret
```

**TERMINAL** (same terminal, still inside `backend`)

```powershell
$env:PYTHONPATH = "venv\Lib\site-packages;."
python -m alembic upgrade head
python scripts/seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Start the frontend

**TERMINAL** (another new terminal, from the project root)

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

### Step 4: Open the app

| What | URL |
| --- | --- |
| Web app | http://127.0.0.1:5173 |
| API documentation | http://127.0.0.1:8000/docs |

Sign in with any account from [Demo Accounts](#demo-accounts).

---

## Demo Workflow

```
Raw Materials -> Buyer Order -> Production Batch
   -> 10 Fabric Rolls (1,000 m) -> Quality Inspection
   -> Finished Goods -> Dispatch (500 m)
   -> Invoice + Financial Records -> Buyer Order Tracking
```

**Sample data**

| Item | Value |
| --- | --- |
| Order | `ORD-2026-DEMO-01` |
| Dispatch | `DSP-2026-DEMO-01` |
| Invoice | `INV-2026-DEMO-01` |
| Inspection result | 8 rolls passed, 1 rework, 1 rejected |
| Dispatched | 5 rolls (500 m) |
| Financials | $5,200 revenue, $420 dye expense, $380 labour wages, $3,000 received by wire transfer |

The demo data is illustrative, not real factory data.

---

## Testing and API

The project includes 43 backend integration tests covering authentication, database constraints and business modules.

**TERMINAL** (project root, with the backend environment configured)

```powershell
python -m pytest backend/tests -v
```

**Postman:** import `postman/Textile_API.postman_collection.json`, set `baseUrl` to `http://127.0.0.1:8000/api`, then run the **Admin login** request to get the authentication token.

---


## Expected Outcome

One platform for production tracking, inventory accuracy, quality control, financial visibility and buyer communication, replacing manual paperwork and phone-based coordination.
