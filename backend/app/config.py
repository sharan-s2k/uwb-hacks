from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str = "postgresql://civicfix:civicfix@localhost:5432/civicfix"
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "gemma:2b"
    upload_dir: str = "uploads" # Directory to store uploaded files
    max_upload_size_bytes: int = 5 * 1024 * 1024 # Maximum size of uploaded files
    allowed_upload_mime_types: tuple[str, ...] = ("image/png", "image/jpeg", "image/webp") # Allowed MIME types for uploaded files
    ai_triage_retry_count: int = 1 # Number of retries for AI triage

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", ".env"),
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
