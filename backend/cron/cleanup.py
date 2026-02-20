from database import SessionLocal
from models.models import Photo
from storage.r2 import delete_file
from datetime import datetime

def cleanup_expired_photos():
    db = SessionLocal()
    try:
        expired = db.query(Photo).filter(Photo.expires_at < datetime.utcnow()).all()
        count = 0
        for photo in expired:
            try:
                filename = photo.file_url.split("/")[-1]
                filename = f"photos/{filename}"
                delete_file(filename)
                db.delete(photo)
                count += 1
            except Exception as e:
                print(f"Error deleting photo {photo.id}: {e}")
        db.commit()
        print(f"Cleaned up {count} expired photos")
    finally:
        db.close()