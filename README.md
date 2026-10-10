# Textile Manufacturing Management System (Everest Textile Mills)

> **Hackathon Prototype**: *"Build One System to Replace Notebooks and Phone Calls"*
> An integrated ERP and MES platform for textile mills connecting raw materials, spinning, weaving, dyeing, four-point quality inspection, finished goods dispatch, factory workforce wages, and buyer order tracking.

---

## 1. System Architecture & Tech Stack

```
                                      +------------------------------------+
                                      |     React + Vite Frontend (SPA)    |
                                      |    Tailwind CSS + Recharts + Lucide|
                                      |        http://127.0.0.1:5173       |
                                      +-----------------+------------------+
                                                        |
                                                        | REST API (Bearer JWT)
                                                        v
                                      +------------------------------------+
                                      |         FastAPI Backend            |
                                      |    SQLAlchemy 2.x + Alembic + JWT  |
                                      |        http://127.0.0.1:8000       |
                                      +-----------------+------------------+
                                                        |
                                                        | Port 5433 (PostgreSQL)
                                                        v
                                      +------------------------------------+
                                      |    PostgreSQL 16 Relational DB     |
                                      |   Check Constraints + Audit Logs   |
                                      +------------------------------------+
```

### Core Technologies
- **Frontend**: React.js 18, Vite, Tailwind CSS 3, Recharts 2 (charts & telemetry), Lucide React (modern icons).
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0 (declarative mapped columns), Alembic (schema migrations), Pydantic v2.
- **Security**: Direct `bcrypt` password hashing (strictly enforced `<= 72 bytes`), `PyJWT` bearer token auth, fine-grained Role-Based Access Control (RBAC).
- **Database**: PostgreSQL on mapped host port **5433** (`textile_db`, user: `textile_user`, password: `textile_pass`).

---

## 2. Seeded Demo Accounts

The database comes pre-seeded with 6 role-based accounts. All passwords adhere to the 72-byte limit and strict hashing.

| Role | Email | Password | Landing Page & Access Rights |
|---|---|---|---|
| **Admin** | `admin@everest.test` | `Admin@123` | Full access (`/dashboard`, `/users`, all modules) |
| **Store Manager** | `store@everest.test` | `Store@123` | `/inventory`, `/orders`, `/dispatch` |
| **Production Operator** | `production@everest.test` | `Prod@123` | `/production` (Machines, batch output, downtime) |
| **Quality Inspector** | `quality@everest.test` | `Quality@123` | `/quality` (Roll inspection, four-point defect tagging) |
| **Accounts Officer** | `accounts@everest.test` | `Accounts@123` | `/finance`, `/workers` (Costs, payroll, margins, payments) |
| **Fabric Buyer** | `buyer@everest.test` | `Buyer@123` | `/my-orders` (Order tracking & dispatch challans) |

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL running locally or in Docker on port **5433**

---

### Step 1: Database Setup

#### Option A: Docker Compose (Recommended)
`TERMINAL` (PowerShell or Bash):
```bash
docker compose up -d
```

#### Option B: Native PostgreSQL / WSL Ubuntu
Ensure PostgreSQL is listening on port **5433** with credentials:
- **Host**: `127.0.0.1`
- **Port**: `5433`
- **Database**: `textile_db`
- **User**: `textile_user`
- **Password**: `textile_pass`

---

### Step 2: Backend Setup

#### Windows PowerShell:
`TERMINAL`:
```powershell
# Navigate to backend
cd backend

# Create virtual environment if not already created
python -m venv venv

# Set PYTHONPATH and install dependencies
$env:PYTHONPATH = "venv\Lib\site-packages;."
python -m pip install -r requirements.txt

# Configure environment variables
# FILE: backend/.env
# Copy from backend/.env.example if missing:
# DATABASE_URL=postgresql://textile_user:textile_pass@127.0.0.1:5433/textile_db
# SECRET_KEY=everest_textile_mills_super_secret_production_key_2026_hackathon_secure

# Run database migrations
python -m alembic upgrade head

# Seed demo users and complete demo production flow
python scripts/seed.py

# Launch FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### macOS / Linux / Bash:
`TERMINAL`:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API Documentation will be live at: `http://127.0.0.1:8000/docs`

---

### Step 3: Frontend Setup

#### Windows PowerShell:
`TERMINAL`:
```powershell
cd frontend

# Install npm dependencies
npm.cmd install

# Start Vite development server
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

#### macOS / Linux / Bash:
`TERMINAL`:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend UI will be live at: `http://127.0.0.1:5173`

---

## 4. Running Acceptance Tests

The project includes an exhaustive automated test suite with **33 backend integration tests** validating authentication, database check constraints, and all 9 business modules.

`TERMINAL` (Windows PowerShell):
```powershell
$env:PYTHONPATH = "c:\Users\varsh\OneDrive\Documents\textile\backend\venv\Lib\site-packages;c:\Users\varsh\OneDrive\Documents\textile\backend"
python -m pytest backend/tests -v
```

`TERMINAL` (macOS / Linux):
```bash
pytest backend/tests -v
```

---

## 5. End-to-End Walkthrough of the Demo Flow

The system simulates the complete real-world production lifecycle of **1,000 metres of Royal Blue Cotton Poplin fabric**:

```
[1. Raw Material Stock] ---> [2. Buyer Order Created] ---> [3. Automated Yarn Check]
    Navy Blue Yarn 30s           ORD-2026-DEMO-01              250 kg yarn verified
            |
            v
[4. Weaving & Spinning Batch] ---> [5. 10 Serialized Rolls Generated]
    Loom WL-01 (1000m output)          ROL-DEMO-0001 to ROL-DEMO-0010 (100m each)
            |
            v
[6. Quality Control Station]
    8 Rolls Grade A Passed  ---> Auto-enrolled into Finished Goods
    1 Roll Rework Flagged   ---> Selvage tension adjustment
    1 Roll Rejected Scrap   ---> Oil stain defect recorded
            |
            v
[7. Outward Dispatch & Challan]
    5 Passed Rolls (500m) Dispatched ---> Atomic inventory deduction
    Delivery Challan DSP-2026-DEMO-01 & Invoice INV-2026-DEMO-01 issued
            |
            v
[8. Factory Financials & Buyer Portal]
    $5,200 Revenue, $420 Dye Expense, $380 Labour Wages, $3,000 Wire Received
    Buyer tracks live pipeline without making phone calls!
```

---

## 6. Postman API Collection

A full Postman collection is provided in the repository:
- `FILE: postman/Textile_API.postman_collection.json`

### Importing into Postman:
1. Open Postman -> Click **Import**.
2. Select `postman/Textile_API.postman_collection.json`.
3. Set the collection variable `baseUrl` to `http://127.0.0.1:8000/api`.
4. Execute `1. Authentication -> Login - Admin`. The collection test script automatically saves the Bearer token to `{{authToken}}` for all subsequent requests.

---

## 7. Troubleshooting & Gotchas

### Issue 1: Database Connection Refused on Port 5433
- **Cause**: PostgreSQL is stopped or running on the default port 5432 instead of the required port 5433.
- **Fix**: Check `docker compose ps` or verify that your PostgreSQL instance has `port = 5433` configured in `postgresql.conf`.

### Issue 2: Windows AppLocker / Script Execution Policy Blocks `alembic.exe` or `npm.ps1`
- **Cause**: Windows Application Control policy restricts executing `.exe` binaries inside user virtual environments, and PowerShell blocks `.ps1` execution.
- **Fix**: 
  - Always execute Python modules via: `python -m alembic upgrade head` or `python -m uvicorn app.main:app`.
  - Always run Node scripts using `npm.cmd` and `npx.cmd`.

### Issue 3: Bcrypt 72-Byte Password Limit
- **Cause**: Passwords exceeding 72 bytes cause runtime truncation or failures in standard `bcrypt`.
- **Fix**: The backend strictly validates password byte length in `app/core/security.py` and rejects passwords longer than 72 bytes with HTTP 422 before hashing.

### Issue 4: Duplicate Roll Dispatch Rejected
- **Cause**: A fabric roll cannot be dispatched twice.
- **Fix**: The database schema strictly enforces a unique constraint on `dispatch_items.roll_id`. The backend rejects duplicate roll assignments with HTTP 400.
