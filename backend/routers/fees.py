from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Student, FeeRecord, FeeStatus, UserRole, Notification
from auth.dependencies import get_current_user, require_admin, require_super_admin
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/fees", tags=["Fees"])

class ManualEntryCreate(BaseModel):
    student_id: int
    month: int
    year: int
    amount: float
    paid_date: Optional[str] = None  # "YYYY-MM-DD" format, defaults to today


class FeeStatusResponse(BaseModel):
    student_id: int
    full_name: str
    month: int
    year: int
    status: str
    amount: Optional[float]

class FeeSummaryResponse(BaseModel):
    branch_id: int
    branch_name: str
    total_students: int
    paid_count: int
    pending_count: int
    rejected_count: int = 0

    class Config:
        from_attributes = True


def create_notification(db: Session, user_id: int, message: str, triggered_by: int = None):
    notification = Notification(user_id=user_id, message=message, triggered_by=triggered_by)
    db.add(notification)
    db.commit()

@router.get("/my-status")
def get_my_fee_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    records = db.query(FeeRecord).filter(FeeRecord.student_id == student.id).order_by(FeeRecord.year.desc(), FeeRecord.month.desc()).all()
    return records

@router.get("/branch-overview")
def get_branch_overview(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    students = db.query(Student).join(User).filter(
        User.branch_id == current_user.branch_id,
        User.role == UserRole.student
    ).all()
    result = []
    for student in students:
        record = db.query(FeeRecord).filter(
            FeeRecord.student_id == student.id,
            FeeRecord.month == month,
            FeeRecord.year == year
        ).first()
        result.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "month": month,
            "year": year,
            "status": record.status.value if record else "no_record",
            "amount": record.amount if record else None,
            "payment_type": record.payment_type if record else None
        })
    return result

@router.get("/branch-summary", response_model=FeeSummaryResponse)
def get_branch_summary(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from models.models import Branch
    now = datetime.utcnow()
    branch = db.query(Branch).filter(Branch.id == current_user.branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    students = db.query(Student).join(User).filter(
        User.branch_id == current_user.branch_id,
        User.role == UserRole.student
    ).all()
    student_ids = [s.id for s in students]
    paid = db.query(FeeRecord).filter(
        FeeRecord.student_id.in_(student_ids),
        FeeRecord.status.in_([FeeStatus.paid_online, FeeStatus.paid_offline]),
        FeeRecord.month == now.month,   # add this
        FeeRecord.year == now.year      # add this
    ).count()
    pending = db.query(FeeRecord).filter(
        FeeRecord.student_id.in_(student_ids),
        FeeRecord.status == FeeStatus.pending,
        FeeRecord.month == now.month,
        FeeRecord.year == now.year
    ).count()
    rejected = db.query(FeeRecord).filter(
        FeeRecord.student_id.in_(student_ids),
        FeeRecord.status == FeeStatus.rejected,
        FeeRecord.month == now.month,
        FeeRecord.year == now.year
    ).count()
    return {
        "branch_id": branch.id,
        "branch_name": branch.name,
        "total_students": len(students),
        "paid_count": paid,
        "pending_count": pending,
        "rejected_count": rejected
    }

@router.get("/summary", response_model=list[FeeSummaryResponse])
def get_financial_summary(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    from models.models import Branch
    branches = db.query(Branch).filter(Branch.is_active == True).all()
    result = []
    for branch in branches:
        students = db.query(Student).join(User).filter(
            User.branch_id == branch.id,
            User.role == UserRole.student  # only students
        ).all()
        student_ids = [s.id for s in students]
        paid = db.query(FeeRecord).filter(
            FeeRecord.student_id.in_(student_ids),
            FeeRecord.status.in_([FeeStatus.paid_online, FeeStatus.paid_offline])
        ).count()
        pending = db.query(FeeRecord).filter(
            FeeRecord.student_id.in_(student_ids),
            FeeRecord.status == FeeStatus.pending
        ).count()
        result.append({
            "branch_id": branch.id,
            "branch_name": branch.name,
            "total_students": len(students),
            "paid_count": paid,
            "pending_count": pending
        })
    return result

@router.post("/manual-entry")
def add_manual_entry(data: ManualEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Verify student belongs to admin's branch
    paid_at = datetime.strptime(data.paid_date, "%Y-%m-%d") if data.paid_date else datetime.utcnow()
    student = db.query(Student).join(User).filter(
        Student.id == data.student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your branch")
    # Check if record already exists
    existing = db.query(FeeRecord).filter(
        FeeRecord.student_id == data.student_id,
        FeeRecord.month == data.month,
        FeeRecord.year == data.year
    ).first()
    if existing:
        if existing.status in [FeeStatus.paid_online, FeeStatus.paid_offline]:
            raise HTTPException(status_code=409, detail="Fee already paid for this month")
        existing.status = FeeStatus.paid_offline
        existing.amount = data.amount
        existing.payment_type = "cash"
        existing.paid_at = paid_at  # add this
        create_notification(db, student.user_id, f"Admin logged a cash payment of {data.amount} for {data.month}/{data.year}", triggered_by=current_user.id)
        db.commit()
        return existing
    record = FeeRecord(
        student_id=data.student_id,
        month=data.month,
        year=data.year,
        status=FeeStatus.paid_offline,
        payment_type="cash",
        amount=data.amount,
        paid_at=paid_at  # add this
    )
    db.add(record)
    create_notification(db, student.user_id, f"Admin logged a cash payment of {data.amount} for {data.month}/{data.year}", triggered_by=current_user.id)
    db.commit()
    db.refresh(record)
    return record

@router.get("/student/{student_id}")
def get_student_fee_history(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    student = db.query(Student).join(User).filter(
        Student.id == student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your branch")
    return db.query(FeeRecord).filter(FeeRecord.student_id == student_id).order_by(FeeRecord.year.desc(), FeeRecord.month.desc()).all()
