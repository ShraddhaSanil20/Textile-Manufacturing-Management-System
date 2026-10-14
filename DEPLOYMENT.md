# Deployment Guide — Everest Textile Management System

This guide covers production deployment for the **FastAPI Backend**, **React Frontend**, and **PostgreSQL Database**.

---

## Deployment Architecture Overview

```
[ Buyer / Admin / Manager Browser ]
                |
                v
  +---------------------------+
  |    Frontend (React SPA)   |  Hosted on: Vercel / Netlify / Render
  |      (Vite + Tailwind)    |
  +---------------------------+
                |
                | REST API (JWT)
                v
  +---------------------------+
  |    Backend (FastAPI)      |  Hosted on: Render / Railway / Fly.io
  |   (Uvicorn + Alembic)     |
  +---------------------------+
                |
                | PostgreSQL Connection
                v
  +---------------------------+
  |   PostgreSQL 16 Database  |  Hosted on: Render Postgres / Neon / Supabase
  +---------------------------+
```

---

## Option 1: 1-Click Blueprint on Render (Easiest Cloud Setup)

A [`render.yaml`](file:///c:/Users/varsh/OneDrive/Documents/textile/render.yaml) blueprint is pre-configured in this repository. It automatically sets up:
- Managed **PostgreSQL** database (`textile-postgres`)
- **FastAPI Web Service** with automatic Alembic migrations & initial demo data seeding
- **React Frontend Static Site** with SPA routing

### Steps to Deploy on Render:
1. Push your latest code to GitHub:
   ```bash
   git add .
   git commit -m "Add production deployment configurations"
   git push origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository: `ShraddhaSanil20/Textile-Manufacturing-Management-System`.
5. Render will automatically detect [`render.yaml`](file:///c:/Users/varsh/OneDrive/Documents/textile/render.yaml) and display:
   - `textile-postgres` (Database)
   - `textile-api` (Web Service)
   - `textile-frontend` (Static Site)
6. Click **Apply**.
7. Once deployed, get your `textile-api` URL (e.g., `https://textile-api-xxxx.onrender.com`), and verify:
   - Health check: `https://textile-api-xxxx.onrender.com/api/health`
   - API Docs: `https://textile-api-xxxx.onrender.com/docs`
   - If needed, update `VITE_API_BASE_URL` in `textile-frontend` environment settings to `https://textile-api-xxxx.onrender.com/api` and trigger a re-deploy.

---

## Option 2: Frontend on Vercel + Backend & DB on Render / Neon (Best Performance)

This setup is popular for production because Vercel provides instant global CDN edge distribution and zero cold starts for React.

### Step 1: Deploy Database (Render or Neon)
1. Go to [Render](https://render.com) or [Neon](https://neon.tech) and create a free PostgreSQL database:
   - Name: `textile_db`
   - User: `textile_user`
2. Copy the **External Connection String** (e.g., `postgres://textile_user:...@ep-xyz.render.com/textile_db`).
   *(Note: Our system automatically normalizes `postgres://` to `postgresql://`).*

### Step 2: Deploy Backend to Render or Railway
1. In Render, click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `chmod +x start.sh && ./start.sh`
4. Add **Environment Variables**:
   | Variable | Value | Description |
   | --- | --- | --- |
   | `DATABASE_URL` | `postgresql://...` | Connection string from Step 1 |
   | `SECRET_KEY` | *(generate a random 32+ character string)* | Used for JWT signing |
   | `CORS_ORIGINS` | `*` *(or your Vercel URL)* | Allowed frontend origins |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `120` | Token validity |
5. Click **Create Web Service**. The backend will automatically run migrations and seed demo accounts on launch.
6. Note your backend URL: e.g. `https://your-api.onrender.com`.

### Step 3: Deploy Frontend to Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and choose `frontend`
4. Expand **Environment Variables** and add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-api.onrender.com/api` *(replace with your backend URL)*
5. Click **Deploy**.
6. The app will build and go live instantly with pre-configured client-side routing via [`frontend/vercel.json`](file:///c:/Users/varsh/OneDrive/Documents/textile/frontend/vercel.json).

---

## Option 3: Full-Stack Docker Deployment (VPS or Self-Hosted)

If deploying to a VPS (DigitalOcean Droplet, AWS EC2, Linode, or local server):

1. Clone repository to server:
   ```bash
   git clone https://github.com/ShraddhaSanil20/Textile-Manufacturing-Management-System.git
   cd Textile-Manufacturing-Management-System
   ```

2. (Optional) Customize environment variables in a `.env` file or export them:
   ```bash
   export SECRET_KEY=$(openssl rand -hex 32)
   export VITE_API_BASE_URL=http://your-server-ip:8000/api
   ```

3. Start all services using [`docker-compose.prod.yml`](file:///c:/Users/varsh/OneDrive/Documents/textile/docker-compose.prod.yml):
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. The containers will launch:
   - **Frontend**: Port `80` (Nginx serving React)
   - **Backend API**: Port `8000` (FastAPI with migrations and seed)
   - **PostgreSQL**: Port `5433`

---

## Verification & Default Accounts

Once deployed, access the web app and sign in with any of the pre-seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| **Admin** | `admin@everest.test` | `Admin@123` |
| **Store Manager** | `store@everest.test` | `Store@123` |
| **Production Operator** | `production@everest.test` | `Prod@123` |
| **Quality Inspector** | `quality@everest.test` | `Quality@123` |
| **Accounts Officer** | `accounts@everest.test` | `Accounts@123` |
| **Fabric Buyer** | `buyer@everest.test` | `Buyer@123` |

> **Security Note:** In a commercial production environment, change the default passwords or delete test accounts from the Admin user management panel.
