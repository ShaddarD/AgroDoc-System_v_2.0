from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/agrodoc"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672//"
    files_storage_root: str = "/data/files"
    files_storage_backend: str = "local"
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_endpoint_url: str = ""  # e.g. http://minio:9000 for S3-compatible APIs
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

    jwt_secret_key: str = "dev-change-me-in-production-use-256-bit"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    auth_bypass_headers: bool = False


settings = Settings()
