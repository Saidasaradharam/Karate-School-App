from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Student, Attendance, BranchSchedule, UserRole
from auth.dependencies import get_current_user, require_admin, get_admin_branch_ids
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/attendance", tags=["Attendance"])

class AttendanceMarkRequest(BaseModel):
    student_id: int
    date: str  # "YYYY-MM-DD"
    status: str  # "present", "absent", "informed_leave"

class BulkAttendanceRequest(BaseModel):
    date: str
    records: list[dict]  # [{"student_id": 1, "status": "present"}, ...]

def validate_class_day(branch_id: int, date_str: str, db: Session):
    date = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_week = date.weekday()  # 0=Monday, 6=Sunday
    schedule = db.query(BranchSchedule).filter(
        BranchSchedule.branch_id == branch_id,
        BranchSchedule.day_of_week == day_of_week
    ).first()
    if not schedule:
        raise HTTPException(
            status_code=400,
            detail=f"No class scheduled on {date.strftime('%A')} for this branch"
        )

@router.post("/mark")
def mark_attendance(data: AttendanceMarkRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Validate student belongs to admin's branch
    student = db.query(Student).join(User).filter(
        Student.id == data.student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your branch")
    # Validate it's a class day
    validate_class_day(current_user.branch_id, data.date, db)
    # Check if already marked
    existing = db.query(Attendance).filter(
        Attendance.student_id == data.student_id,
        Attendance.date == data.date
    ).first()
    if existing:
        existing.status = data.status
        existing.marked_by = current_user.id
        db.commit()
        return existing
    attendance = Attendance(
        student_id=data.student_id,
        branch_id=current_user.branch_id,
        marked_by=current_user.id,
        date=data.date,
        status=data.status
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

@router.post("/mark-bulk")
def mark_bulk_attendance(data: BulkAttendanceRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Validate it's a class day first
    validate_class_day(current_user.branch_id, data.date, db)
    results = []
    for record in data.records:
        student = db.query(Student).join(User).filter(
            Student.id == record["student_id"],
            User.branch_id == current_user.branch_id
        ).first()
        if not student:
            continue
        existing = db.query(Attendance).filter(
            Attendance.student_id == record["student_id"],
            Attendance.date == data.date
        ).first()
        if existing:
            existing.status = record["status"]
            existing.marked_by = current_user.id
        else:
            db.add(Attendance(
                student_id=record["student_id"],
                branch_id=current_user.branch_id,
                marked_by=current_user.id,
                date=data.date,
                status=record["status"]
            ))
        results.append(record["student_id"])
    db.commit()
    return {"message": f"Attendance marked for {len(results)} students"}

@router.get("/branch")
def get_branch_attendance(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: Optional[int] = None,  
    current_user: User = Depends(require_admin)
):
    branch_ids = get_admin_branch_ids(db, current_user)
    if branch_id:
        if branch_id not in branch_ids and current_user.role != UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Access denied to this branch")
        branch_ids = [branch_id]

    date = date or datetime.utcnow().strftime("%Y-%m-%d")
    students = db.query(Student).join(User).filter(
        User.branch_id.in_(branch_ids),
        User.role == UserRole.student
    ).all()
    result = []
    for student in students:
        record = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.date == date
        ).first()
        result.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "date": date,
            "status": record.status if record else "not_marked"
        })
    return result

@router.get("/my-attendance")
def get_my_attendance(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    # Filter by month/year using string prefix
    month_str = f"{year}-{str(month).zfill(2)}"
    records = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.date.like(f"{month_str}%")
    ).order_by(Attendance.date).all()
    return records

@router.get("/summary/{student_id}")
def get_student_attendance_summary(
    student_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    student = db.query(Student).join(User).filter(
        Student.id == student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    month_str = f"{year}-{str(month).zfill(2)}"
    records = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.date.like(f"{month_str}%")
    ).all()
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    informed = sum(1 for r in records if r.status == "informed_leave")
    return {
        "student_id": student_id,
        "full_name": student.full_name,
        "month": month,
        "year": year,
        "present": present,
        "absent": absent,
        "informed_leave": informed,
        "total_classes": len(records)
    }

@router.get("/branch/history")
def get_attendance_history(
    month: Optional[int] = None,
    year: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    month_str = f"{year}-{str(month).zfill(2)}"
    branch_ids = get_admin_branch_ids(db, current_user)
    if branch_id:
        if branch_id not in branch_ids and current_user.role != UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Access denied to this branch")
        branch_ids = [branch_id]
    students = db.query(Student).join(User).filter(
        User.branch_id.in_(branch_ids),
        User.role == UserRole.student
    ).all()

    # Get all class days for this branch in this month
    schedules = db.query(BranchSchedule).filter(
        BranchSchedule.branch_id == current_user.branch_id
    ).all()
    class_days = [s.day_of_week for s in schedules]

    # Get all dates in this month that are class days
    import calendar
    num_days = calendar.monthrange(year, month)[1]
    valid_dates = [
        f"{month_str}-{str(d).zfill(2)}"
        for d in range(1, num_days + 1)
        if datetime(year, month, d).weekday() in class_days
    ]

    result = []
    for student in students:
        records = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.date.like(f"{month_str}%")
        ).all()
        record_map = {r.date: r.status for r in records}
        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        informed = sum(1 for r in records if r.status == "informed_leave")
        result.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "present": present,
            "absent": absent,
            "informed_leave": informed,
            "total_classes": len(valid_dates),
            "records": [
                {
                    "date": date,
                    "status": record_map.get(date, "not_marked")
                }
                for date in valid_dates
            ]
        })
    return result