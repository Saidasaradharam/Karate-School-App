from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Branch, BranchRequest, User, RequestStatus, Student, UserRole
from auth.dependencies import get_current_user, require_admin, require_super_admin, get_admin_branch_ids
from typing import Optional
from pydantic import BaseModel
from models.models import BranchSchedule

router = APIRouter(prefix="/branches", tags=["Branches"])

class BranchRequestCreate(BaseModel):
    name: str
    location: str
    reason: Optional[str] = None

class BranchRequestAction(BaseModel):
    reason: str = None

class ScheduleUpdate(BaseModel):
    days: list[int]  # [0,1,2,3,4,5,6] — 0=Monday, 6=Sunday

class BranchCreate(BaseModel):
    name: str
    location: str

@router.post("/request")
def request_branch(data: BranchRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    branch = Branch(name=data.name, location=data.location, is_active=False)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    req = BranchRequest(branch_id=branch.id, requested_by=current_user.id)
    db.add(req)
    db.commit()
    return {"message": "Branch request submitted", "branch_id": branch.id}

@router.get("/requests")
def get_branch_requests(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    requests = db.query(BranchRequest).filter(BranchRequest.status == RequestStatus.pending).all()
    return [
        {
            "id": req.id,
            "branch_id": req.branch_id,
            "branch": {"name": req.branch.name, "location": req.branch.location} if req.branch else None,
            "requested_by": req.requested_by,
            "status": req.status,
            "created_at": req.created_at
        }
        for req in requests
    ]

@router.patch("/requests/{id}/approve")
def approve_branch(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    req = db.query(BranchRequest).filter(BranchRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = RequestStatus.approved
    req.branch.is_active = True
    db.commit()
    return {"message": "Branch approved"}

@router.patch("/requests/{id}/reject")
def reject_branch(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    req = db.query(BranchRequest).filter(BranchRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = RequestStatus.rejected
    db.commit()
    return {"message": "Branch rejected"}

@router.get("/")
def get_branches(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    return db.query(Branch).all()

@router.get("/my-branch")
def get_my_branch(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    branch = db.query(Branch).filter(Branch.id == current_user.branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@router.get("/public")
def get_public_branches(db: Session = Depends(get_db)):
    return db.query(Branch).filter(Branch.is_active == True).all()

@router.get("/my-branch-admins")
def get_my_branch_admins(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admins = db.query(User).filter(
        User.branch_id == current_user.branch_id,
        User.role.in_([UserRole.admin, UserRole.super_admin])
    ).all()
    return [{"id": a.id, "email": a.email} for a in admins]

@router.get("/overview")
def get_branches_overview(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    branches = db.query(Branch).all()
    result = []
    for branch in branches:
        admins = db.query(User).filter(
            User.branch_id == branch.id,
            User.role == UserRole.admin
        ).all()
        students = db.query(Student).join(User).filter(
            User.branch_id == branch.id,
            User.role == UserRole.student
        ).all()
        result.append({
            "id": branch.id,
            "name": branch.name,
            "location": branch.location,
            "is_active": branch.is_active,
            "admin_count": len(admins),
            "student_count": len(students),
            "admins": [{"id": a.id, "email": a.email} for a in admins]
        })
    return result


@router.get("/my-schedule")
def get_my_schedule(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    branch_ids = get_admin_branch_ids(db, current_user)
    schedules = db.query(BranchSchedule).filter(
        BranchSchedule.branch_id.in_(branch_ids)
    ).all()
    return [s.day_of_week for s in schedules]

@router.put("/my-schedule")
def update_my_schedule(
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Delete existing schedule
    db.query(BranchSchedule).filter(
        BranchSchedule.branch_id == current_user.branch_id
    ).delete()
    # Insert new schedule
    for day in data.days:
        if day < 0 or day > 6:
            raise HTTPException(status_code=400, detail=f"Invalid day: {day}")
        db.add(BranchSchedule(
            branch_id=current_user.branch_id,
            day_of_week=day
        ))
    db.commit()
    return {"message": "Schedule updated", "days": data.days}

@router.post("/")
def create_branch(
    data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    existing = db.query(Branch).filter(Branch.name == data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Branch with this name already exists")
    branch = Branch(name=data.name, location=data.location, is_active=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch

@router.patch("/{id}")
def update_branch(
    id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    branch = db.query(Branch).filter(Branch.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for key, value in data.items():
        setattr(branch, key, value)
    db.commit()
    return branch

@router.get("/my-branches")
def get_my_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from models.models import AdminBranch
    if current_user.role == UserRole.super_admin:
        branches = db.query(Branch).filter(Branch.is_active == True).all()
        return branches
    # Get all branches assigned to this admin
    admin_branches = db.query(AdminBranch).filter(
        AdminBranch.admin_id == current_user.id
    ).all()
    branch_ids = [ab.branch_id for ab in admin_branches]
    # Fallback to primary branch_id
    if not branch_ids and current_user.branch_id:
        branch_ids = [current_user.branch_id]
    branches = db.query(Branch).filter(Branch.id.in_(branch_ids)).all()
    return branches