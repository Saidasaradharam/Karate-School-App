from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from routers.auth import router as auth_router
from routers.branches import router as branches_router
from routers.students import router as students_router
from routers.fees import router as fees_router
from routers.payments import router as payments_router
from routers.notifications import router as notifications_router

app = FastAPI(
    title="Karate School Management API",
    swagger_ui_parameters={"persistAuthorization": True}
)

app.include_router(auth_router)
app.include_router(branches_router)
app.include_router(students_router)
app.include_router(fees_router)
app.include_router(payments_router)
app.include_router(notifications_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],    # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}