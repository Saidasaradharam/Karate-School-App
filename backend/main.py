from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from cron.cleanup import cleanup_expired_photos
from contextlib import asynccontextmanager
from routers.auth import router as auth_router
from routers.branches import router as branches_router
from routers.students import router as students_router
from routers.fees import router as fees_router
from routers.payments import router as payments_router
from routers.notifications import router as notifications_router
from routers.photos import router as photos_router
from routers.belt_grades import router as belt_grades_router
from routers.attendance import router as attendance_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import settings
from routers.admins import router as admins_router

origins = settings.allowed_origins.split(",")

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app):
    scheduler.add_job(cleanup_expired_photos, "cron", hour=0, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="Karate School Management API",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Routers
app.include_router(auth_router)
app.include_router(branches_router)
app.include_router(students_router)
app.include_router(fees_router)
app.include_router(payments_router)
app.include_router(notifications_router)
app.include_router(photos_router)
app.include_router(belt_grades_router)
app.include_router(attendance_router)
app.include_router(admins_router)

# Middlewares — each is a separate call
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.railway.app", "*.vercel.app"]
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

@app.get("/health")
def health_check():
    return {"status": "ok"}