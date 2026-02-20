from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.models import Branch, BranchRequest, User, RequestStatus
from auth.dependencies import get_current_user, require_admin, require_super_admin
from pydantic import BaseModel

router = APIRouter(prefix="/branches", tags=["Branches"])

class BranchRequestCreate(BaseModel):
    name: str
    location: str

class BranchRequestAction(BaseModel):
    reason: str = None

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
    return db.query(BranchRequest).filter(BranchRequest.status == RequestStatus.pending).all()

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