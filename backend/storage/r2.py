import os
import boto3
from botocore.client import Config
from fastapi import HTTPException
import uuid

R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN")

def is_r2_configured():
    return (
        R2_ENDPOINT_URL 
        and R2_ENDPOINT_URL != "changethislater" 
        and not R2_ENDPOINT_URL.startswith("changethis")
    )

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )

def upload_file(file_bytes: bytes, file_name: str, content_type: str) -> str:
    """
    Uploads to Cloudflare R2 if configured, otherwise falls back to local storage for testing.
    """
    if is_r2_configured():
        s3_client = get_r2_client()
        try:
            s3_client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=file_name,
                Body=file_bytes,
                ContentType=content_type
            )
            if R2_PUBLIC_DOMAIN:
                return f"{R2_PUBLIC_DOMAIN.rstrip('/')}/{file_name}"
            else:
                return f"{R2_ENDPOINT_URL.rstrip('/')}/{R2_BUCKET_NAME}/{file_name}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to R2: {str(e)}")
    else:
        # Local fallback storage for easy testing without R2
        local_dir = os.path.join(os.getcwd(), "static", "photos")
        os.makedirs(local_dir, exist_ok=True)
        
        # Extract filename from path like "photos/uuid.jpg"
        base_name = os.path.basename(file_name)
        local_path = os.path.join(local_dir, base_name)
        
        with open(local_path, "wb") as f:
            f.write(file_bytes)
            
        # Return local static URL
        return f"http://127.0.0.1:8000/static/photos/{base_name}"

def delete_file(file_name: str):
    """
    Deletes a file from R2 or local storage.
    """
    if is_r2_configured():
        s3_client = get_r2_client()
        try:
            s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=file_name)
        except Exception as e:
            print(f"Failed to delete file from R2: {str(e)}")
    else:
        try:
            base_name = os.path.basename(file_name)
            local_path = os.path.join(os.getcwd(), "static", "photos", base_name)
            if os.path.exists(local_path):
                os.remove(local_path)
        except Exception as e:
            print(f"Failed to delete local file: {str(e)}")