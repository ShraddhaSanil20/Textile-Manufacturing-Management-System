#!/bin/bash
set -e

echo "=== Everest Textile Management API - Startup ==="

echo "--> Step 1: Running database migrations (Alembic)..."
python -m alembic upgrade head

echo "--> Step 2: Seeding initial demo data (idempotent)..."
python scripts/seed.py || echo "[WARN] Seed step completed with warnings or was skipped."

echo "--> Step 3: Starting production Uvicorn server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
