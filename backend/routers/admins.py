from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from utils.notify import notify_user
from database import get_db
from models.models import User, Student, UserRole, AdminBranch, Branch, PromotionRequest
from auth.dependencies import get_current_user, require_super_admin, require_admin
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/admins", tags=["Admins"])

class AdminCreateRequest(BaseModel):
    email: str
    password: str
    full_name: str
    primary_branch_id: int        
    additional_branch_ids: list[int] = [] 
    dob: str
    contact: str
    address: str
    belt_grade: str

class AdminUpdateRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    primary_branch_id: Optional[int] = None
    additional_branch_ids: Optional[list[int]] = None
    dob: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    belt_grade: Optional[str] = None

class PromoteRequest(BaseModel):
    user_id: int
    primary_branch_id: int
    additional_branch_ids: list[int] = []

class PromotionRequestCreate(BaseModel):
    reason: Optional[str] = None

class PromotionRequestAction(BaseModel):
    reason: Optional[str] = None

@router.get("/")
def get_all_admins(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    admins = db.query(User).filter(User.role == UserRole.admin).all()
    result = []
    for admin in admins:
        branches = db.query(AdminBranch).filter(AdminBranch.admin_id == admin.id).all()
        student = db.query(Student).filter(Student.user_id == admin.id).first()
        result.append({
            "id": admin.id,
            "email": admin.email,
            "full_name": student.full_name if student else admin.email,
            "contact": student.contact if student else None,
            "dob": str(student.dob) if student and student.dob else None,
            "address": student.address if student else None,
            "belt_grade": student.belt_grade if student else None,
            "primary_branch_id": admin.branch_id,
            "branch_ids": [b.branch_id for b in branches],
            "additional_branch_ids": [b.branch_id for b in branches if b.branch_id != admin.branch_id]
        })
    return result

@router.post("/")
def create_admin(
    data: AdminCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    from auth.utils import hash_password
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.admin,
        branch_id=data.primary_branch_id  # primary branch
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        full_name=data.full_name,
        dob=data.dob,
        contact=data.contact,
        address=data.address,
        belt_grade=data.belt_grade
    )
    db.add(student)

    # Add primary + additional branches
    all_branch_ids = list(set([data.primary_branch_id] + data.additional_branch_ids))
    for branch_id in all_branch_ids:
        db.add(AdminBranch(admin_id=user.id, branch_id=branch_id))

    db.commit()
    return {"message": "Admin created", "admin_id": user.id}

@router.put("/{id}/branches")
def update_admin_branches(
    id: int,
    branch_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    admin = db.query(User).filter(User.id == id, User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    # Delete existing assignments
    db.query(AdminBranch).filter(AdminBranch.admin_id == id).delete()
    # Add new ones
    for branch_id in branch_ids:
        db.add(AdminBranch(admin_id=id, branch_id=branch_id))
    # Update primary branch
    admin.branch_id = branch_ids[0] if branch_ids else None
    db.commit()
    return {"message": "Branches updated"}

@router.put("/{id}")
def update_admin(
    id: int,
    data: AdminUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    admin = db.query(User).filter(User.id == id, User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if data.email: admin.email = data.email
    if data.password:
        from auth.utils import hash_password
        admin.hashed_password = hash_password(data.password)
    if data.primary_branch_id:
        admin.branch_id = data.primary_branch_id

    student = db.query(Student).filter(Student.user_id == id).first()
    if student:
        if data.full_name: student.full_name = data.full_name
        if data.dob: student.dob = data.dob
        if data.contact: student.contact = data.contact
        if data.address: student.address = data.address
        if data.belt_grade: student.belt_grade = data.belt_grade

    if data.primary_branch_id is not None or data.additional_branch_ids is not None:
        primary = data.primary_branch_id or admin.branch_id
        additional = data.additional_branch_ids or []
        all_branch_ids = list(set([primary] + additional))
        db.query(AdminBranch).filter(AdminBranch.admin_id == id).delete()
        for branch_id in all_branch_ids:
            db.add(AdminBranch(admin_id=id, branch_id=branch_id))

    db.commit()
    return {"message": "Admin updated"}

@router.delete("/{id}")
def delete_admin(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    admin = db.query(User).filter(User.id == id, User.role == UserRole.admin).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    # Delete student profile
    db.query(Student).filter(Student.user_id == id).delete()
    # Delete branch assignments
    db.query(AdminBranch).filter(AdminBranch.admin_id == id).delete()
    # Delete user
    db.delete(admin)
    db.commit()
    return {"message": "Admin deleted"}

@router.post("/promote")
def promote_to_admin(
    data: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Find user
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=400, detail="User is already an admin")

    # Branch admins can only promote students from their own branch
    if current_user.role == UserRole.admin:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        student_user = db.query(User).filter(User.id == user.id).first()
        if student_user.branch_id != current_user.branch_id:
            raise HTTPException(status_code=403, detail="Cannot promote student from another branch")
        # Force primary branch to be admin's own branch
        data.primary_branch_id = current_user.branch_id
        data.additional_branch_ids = []

    # Promote
    user.role = UserRole.admin
    user.branch_id = data.primary_branch_id

    # Clear existing branch assignments and reassign
    db.query(AdminBranch).filter(AdminBranch.admin_id == user.id).delete()
    all_branch_ids = list(set([data.primary_branch_id] + data.additional_branch_ids))
    for branch_id in all_branch_ids:
        db.add(AdminBranch(admin_id=user.id, branch_id=branch_id))

    db.commit()
    return {"message": f"{user.email} promoted to admin"}

@router.post("/promotion-requests")
def create_promotion_request(
    data: PromotionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Only students can request promotion")

    # Check if pending request already exists
    existing = db.query(PromotionRequest).filter(
        PromotionRequest.student_id == student.id,
        PromotionRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending promotion request")

    req = PromotionRequest(
        student_id=student.id,
        reason=data.reason
    )
    db.add(req)
    db.commit()

    # Notify all super admins
    super_admins = db.query(User).filter(User.role == UserRole.super_admin).all()
    for sa in super_admins:
        notify_user(
            db,
            user_id=sa.id,
            message=f"{student.full_name} has requested promotion to admin",
            triggered_by=current_user.id,
            push_title="Promotion Request",
            push_url="/superadmin/dashboard"
        )
    return req

@router.get("/promotion-requests")
def get_promotion_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    requests = db.query(PromotionRequest).filter(
        PromotionRequest.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        user = db.query(User).filter(User.id == student.user_id).first() if student else None
        branch = db.query(Branch).filter(Branch.id == user.branch_id).first() if user else None
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "reason": req.reason,
            "status": req.status,
            "created_at": req.created_at,
            "student": {
                "full_name": student.full_name if student else "Unknown",
                "belt_grade": student.belt_grade if student else None,
            },
            "branch": {
                "name": branch.name if branch else "Unknown",
                "location": branch.location if branch else None,
            }
        })
    return result

@router.get("/promotion-requests/my-request")
def get_my_promotion_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return None
    return db.query(PromotionRequest).filter(
        PromotionRequest.student_id == student.id
    ).order_by(PromotionRequest.created_at.desc()).first()

@router.patch("/promotion-requests/{id}/approve")
def approve_promotion_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    req = db.query(PromotionRequest).filter(PromotionRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first()

    # Promote
    user.role = UserRole.admin
    req.status = "approved"
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    # Assign to their current branch
    db.query(AdminBranch).filter(AdminBranch.admin_id == user.id).delete()
    db.add(AdminBranch(admin_id=user.id, branch_id=user.branch_id))

    notify_user(
        db,
        user_id=user.id,
        message="Your request for admin promotion has been approved!",
        triggered_by=current_user.id,
        push_title="Promotion Approved",
        push_url="/admin/dashboard"
    )
    db.commit()
    return {"message": "Promotion approved"}

@router.patch("/promotion-requests/{id}/reject")
def reject_promotion_request(
    id: int,
    data: PromotionRequestAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    req = db.query(PromotionRequest).filter(PromotionRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first()

    req.status = "rejected"
    req.rejection_reason = data.reason
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    notify_user(
        db,
        user_id=user.id,
        message=f"Your promotion request was rejected{f': {data.reason}' if data.reason else ''}",
        triggered_by=current_user.id,
        push_title="Promotion Rejected",
        push_url="/dashboard"
    )
    db.commit()
    return {"message": "Promotion rejected"}


@router.post("/promotion-requests")
def create_promotion_request(
    data: PromotionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Only students can request promotion")

    # Check if pending request already exists
    existing = db.query(PromotionRequest).filter(
        PromotionRequest.student_id == student.id,
        PromotionRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending promotion request")

    req = PromotionRequest(
        student_id=student.id,
        reason=data.reason
    )
    db.add(req)
    db.commit()

    # Notify all super admins
    super_admins = db.query(User).filter(User.role == UserRole.super_admin).all()
    for sa in super_admins:
        notify_user(
            db,
            user_id=sa.id,
            message=f"{student.full_name} has requested promotion to admin",
            triggered_by=current_user.id,
            push_title="Promotion Request",
            push_url="/superadmin/dashboard"
        )
    return req

@router.get("/promotion-requests")
def get_promotion_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return db.query(PromotionRequest).filter(
        PromotionRequest.status == "pending"
    ).all()

@router.get("/promotion-requests/my-request")
def get_my_promotion_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return None
    return db.query(PromotionRequest).filter(
        PromotionRequest.student_id == student.id
    ).order_by(PromotionRequest.created_at.desc()).first()

@router.patch("/promotion-requests/{id}/approve")
def approve_promotion_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    req = db.query(PromotionRequest).filter(PromotionRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first()

    # Promote
    user.role = UserRole.admin
    req.status = "approved"
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    # Assign to their current branch
    db.query(AdminBranch).filter(AdminBranch.admin_id == user.id).delete()
    db.add(AdminBranch(admin_id=user.id, branch_id=user.branch_id))

    notify_user(
        db,
        user_id=user.id,
        message="Your request for admin promotion has been approved!",
        triggered_by=current_user.id,
        push_title="Promotion Approved",
        push_url="/admin/dashboard"
    )
    db.commit()
    return {"message": "Promotion approved"}

@router.patch("/promotion-requests/{id}/reject")
def reject_promotion_request(
    id: int,
    data: PromotionRequestAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    req = db.query(PromotionRequest).filter(PromotionRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first()

    req.status = "rejected"
    req.rejection_reason = data.reason
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    notify_user(
        db,
        user_id=user.id,
        message=f"Your promotion request was rejected{f': {data.reason}' if data.reason else ''}",
        triggered_by=current_user.id,
        push_title="Promotion Rejected",
        push_url="/dashboard"
    )
    db.commit()
    return {"message": "Promotion rejected"}