from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    R2_ACCESS_KEY_ID: str = "changethislater"
    R2_SECRET_ACCESS_KEY: str = "changethislater"
    R2_BUCKET_NAME: str = "karate-photos"
    R2_ENDPOINT_URL: str = "changethislater"
    RAZORPAY_KEY_ID: str = "changethislater"
    RAZORPAY_KEY_SECRET: str = "changethislater"
    VAPID_PUBLIC_KEY: str = "changethislater"
    VAPID_PRIVATE_KEY: str = "changethislater"
    VAPID_EMAIL: str = "mailto:you@email.com"
    ENVIRONMENT: str = "development"
    ONLINE_PAYMENTS_ENABLED: bool = False
    allowed_origins: str = "http://localhost:5173,http://localhost:4173" 
    
    class Config:
        env_file = ".env"

settings = Settings()