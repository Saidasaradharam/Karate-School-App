from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.models import Student, User, UserRole
from auth.utils import hash_password, verify_password
from auth.jwt import create_access_token
from pydantic import BaseModel, EmailStr
from typing import Optional
from auth.dependencies import require_super_admin
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from utils.sanitize import sanitize


limiter = Limiter(key_func=get_remote_address)


router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    branch_id: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AdminCreateRequest(BaseModel):
    email: str
    password: str
    branch_id: int
    full_name: str
    dob: str
    address: str
    contact: str
    belt_grade: str
    last_graduation_date: Optional[str] = None

@router.post("/create-admin")
def create_admin(data: AdminCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    data.email = sanitize(data.email).lower()
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.admin,
        branch_id=data.branch_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Create profile for admin too
    profile = Student(
        user_id=user.id,
        full_name=data.full_name,
        dob=data.dob,
        address=data.address,
        contact=data.contact,
        belt_grade=data.belt_grade,
        last_graduation_date=data.last_graduation_date
    )
    db.add(profile)
    db.commit()
    return {"message": "Admin created successfully", "user_id": user.id}

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    data.email = sanitize(data.email).lower()
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        branch_id=data.branch_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Registered successfully", "user_id": user.id}

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    data.email = sanitize(data.email).lower()
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "branch_id": user.branch_id
    }

@router.get("/me")
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": current_user.branch_id,
        "full_name": student.full_name if student else current_user.email.split("@")[0]
    }