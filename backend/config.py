from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str
    
    max_file_size_mb: int
    allowed_file_types: list[str]

    images_dir: str = "/app/images"
    logs_dir: str = "/app/logs"

    class Config:
        env_file = ".env"
        extra = "ignore"
    

settings = Settings()