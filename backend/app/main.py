from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, users, inventory, orders, production, quality, dispatch, workers, finance, dashboard

app = FastAPI(
    title="Textile Manufacturing Management System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api without trailing slashes
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(production.router, prefix="/api")
app.include_router(quality.router, prefix="/api")
app.include_router(dispatch.router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "healthy", "service": "textile-management-backend"}
