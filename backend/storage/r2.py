import boto3
from botocore.client import Config
from config import settings

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4")
    )

def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    client = get_s3_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=filename,
        Body=file_bytes,
        ContentType=content_type
    )
    return f"{settings.R2_ENDPOINT_URL}/{settings.R2_BUCKET_NAME}/{filename}"

def delete_file(filename: str):
    client = get_s3_client()
    client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=filename
    )