import face_recognition
import numpy as np
import json
import io
from PIL import Image
import requests

def process_image_for_faces(photo_id: int, file_url: str, db_session):
    """
    Downloads the image temporarily, detects faces, extracts embeddings, 
    and saves them to the photo_faces table.
    """
    try:
        # 1. Load image from URL
        response = requests.get(file_url)
        image_bytes = io.BytesIO(response.content)
        image = face_recognition.load_image_file(image_bytes)

        # 2. Find all face locations and 128-dim embeddings
        face_locations = face_recognition.face_locations(image)
        face_encodings = face_recognition.face_encodings(image, face_locations)

        # 3. Save each detected face to database
        from models.models import PhotoFace
        for encoding in face_encodings:
            # Convert numpy array to list/json string for database storage
            encoding_json = json.dumps(encoding.tolist())
            
            face_record = PhotoFace(
                photo_id=photo_id,
                face_encoding=encoding_json,
                cluster_id=None # Will be clustered next
            )
            db_session.add(face_record)
        
        db_session.commit()
    except Exception as e:
        print(f"Error processing faces for photo {photo_id}: {str(e)}")