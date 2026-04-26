from pydantic import BaseModel


class IntakePayload(BaseModel):
    input_type: str
    user_id: str
    description: str
    location_text: str
    image_url: str | None = None
