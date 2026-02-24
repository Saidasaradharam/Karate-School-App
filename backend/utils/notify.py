from sqlalchemy.orm import Session
from models.models import Notification

def notify_user(
    db: Session,
    user_id: int,
    message: str,
    triggered_by: int = None,
    push_title: str = "Karate School",
    push_url: str = "/"
):
    # Save to DB
    notification = Notification(
        user_id=user_id,
        message=message,
        triggered_by=triggered_by
    )
    db.add(notification)
    db.commit()