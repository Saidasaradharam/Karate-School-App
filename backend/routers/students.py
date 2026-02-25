from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Student, UserRole, ActiveBeltGrade
from auth.dependencies import get_current_user, require_admin, require_super_admin, get_admin_branch_ids
from pydantic import BaseModel
from typing import Optional
from utils.sanitize import sanitize

router = APIRouter(prefix="/students", tags=["Students"])

class StudentCreate(BaseModel):
    full_name: str
    dob: str
    parent_name: str
    address: str
    contact: str
    belt_grade: str
    last_graduation_date: Optional[str] = None
    emergency_contact: str

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    belt_grade: Optional[str] = None
    last_graduation_date: Optional[str] = None
    emergency_contact: Optional[str] = None

class UserProfileUpdate(BaseModel):
    profile_picture: Optional[str] = None


def validate_belt_grade(belt_grade: str, db: Session):
    grade = db.query(ActiveBeltGrade).filter(
        ActiveBeltGrade.grade == belt_grade,
        ActiveBeltGrade.is_active == True
    ).first()
    if not grade:
        raise HTTPException(status_code=400, detail=f"Invalid or inactive belt grade: {belt_grade}")

@router.post("/register")
def register_student(data: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can register a profile")
    existing = db.query(Student).filter(Student.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student profile already exists")
    validate_belt_grade(data.belt_grade, db)
    student = Student(
        user_id=current_user.id,
        full_name=data.full_name,
        dob=data.dob,
        parent_name=data.parent_name,
        address=data.address,
        contact=data.contact,
        belt_grade=data.belt_grade,
        last_graduation_date=data.last_graduation_date,
        emergency_contact=data.emergency_contact
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/me")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.put("/me")
def update_my_profile(data: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if data.belt_grade:
        validate_belt_grade(data.belt_grade, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student

@router.get("/")
def get_students(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if current_user.role == UserRole.super_admin:
        students = db.query(Student, User.branch_id).join(User).filter(
            User.role == UserRole.student
        ).offset(skip).limit(limit).all()
        return [
            {**s.__dict__, "branch_id": branch_id}
            for s, branch_id in students
        ]
    else:
        branch_ids = get_admin_branch_ids(db, current_user)
        students = db.query(Student).join(User).filter(
            User.branch_id.in_(branch_ids),
            User.role == UserRole.student
        ).offset(skip).limit(limit).all()
        return students 

@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Branch isolation — admin can only see their branch
    if current_user.role == UserRole.admin:
        if student.user.branch_id != current_user.branch_id:
            raise HTTPException(status_code=403, detail="Access denied")
    return student

@router.put("/me/profile-picture")
def update_profile_picture(data: UserProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.profile_picture:
        raise HTTPException(status_code=400, detail="No profile picture URL provided")
    current_user.profile_picture = data.profile_picture
    db.commit()
    return {"message": "Profile picture updated", "profile_picture": current_user.profile_picture}