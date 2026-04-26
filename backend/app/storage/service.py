from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings


async def save_report_image(image_file: UploadFile | None) -> str | None:
    if not image_file:
        return None

    content_type = image_file.content_type or ""
    if content_type not in settings.allowed_upload_mime_types:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    data = await image_file.read()
    if len(data) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit")

    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)

    extension = ".jpg"
    if content_type == "image/png":
        extension = ".png"
    elif content_type == "image/webp":
        extension = ".webp"

    filename = f"{uuid4()}{extension}"
    destination = upload_root / filename
    destination.write_bytes(data)
    return f"/uploads/{filename}"
