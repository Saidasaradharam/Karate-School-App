from fastapi import HTTPException
from models.models import User, UserRole

def require_same_branch(current_user: User, target_branch_id: int):
    if current_user.role == UserRole.super_admin:
        return  # super admin can access all
    if current_user.branch_id != target_branch_id:
        raise HTTPException(status_code=403, detail="Access denied — branch mismatch")

def require_student_owner(current_user: User, student_user_id: int):
    if current_user.id != student_user_id:
        raise HTTPException(status_code=403, detail="Access denied")