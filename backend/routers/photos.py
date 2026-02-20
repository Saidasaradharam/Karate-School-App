from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Photo
from auth.dependencies import get_current_user
from storage.r2 import upload_file, delete_file
from datetime import datetime, timedelta
from config import settings
import uuid

router = APIRouter(prefix="/photos", tags=["Photos"])

@router.post("/upload")
def upload_photo(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    # Generate unique filename
    ext = file.filename.split(".")[-1]
    filename = f"photos/{uuid.uuid4()}.{ext}"
    # Upload to R2
    file_bytes = file.file.read()
    file_url = upload_file(file_bytes, filename, file.content_type)
    # Save to DB with 7 day expiry
    photo = Photo(
        uploader_id=current_user.id,
        file_url=file_url,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo

@router.get("/")
def get_photos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    photos = db.query(Photo).filter(Photo.expires_at > now).order_by(Photo.created_at.desc()).all()
    result = []
    for photo in photos:
        time_remaining = photo.expires_at - now
        result.append({
            "id": photo.id,
            "file_url": photo.file_url,
            "uploader_id": photo.uploader_id,
            "expires_at": photo.expires_at,
            "days_remaining": time_remaining.days,
            "hours_remaining": time_remaining.seconds // 3600,
            "created_at": photo.created_at
        })
    return result

@router.get("/{id}/download")
def download_photo(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Photo has expired and is no longer available")
    return {"file_url": photo.file_url, "expires_at": photo.expires_at}

@router.delete("/{id}")
def delete_photo(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    photo = db.query(Photo).filter(Photo.id == id, Photo.uploader_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found or not yours")
    filename = photo.file_url.split(f"{settings.R2_BUCKET_NAME}/")[-1]
    delete_file(filename)
    db.delete(photo)
    db.commit()
    return {"message": "Photo deleted"}