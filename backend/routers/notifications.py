from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Notification
from auth.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()

@router.patch("/{id}/read")
def mark_as_read(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    if not notification:
        return {"message": "Notification not found"}
    notification.is_read = True
    db.commit()
    return {"message": "Marked as read"}