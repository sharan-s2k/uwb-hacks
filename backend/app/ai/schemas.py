from typing import Any, Optional, Union

from pydantic import BaseModel, Field

from app.enums import AgencyType, Severity, TicketCategory


class AITriageInput(BaseModel):
    description: str
    location_text: str
    image_url: Optional[str] = None
    input_type: str = "MANUAL"


class AITriageOutput(BaseModel):
    title: str
    category: TicketCategory
    recommended_agency_type: AgencyType
    severity: Severity
    citizen_summary: str
    agency_summary: str
    suggested_action: str
    safety_flag: bool = False
    accessibility_flag: bool = False
    emergency_flag: bool = False
    missing_information: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class TriageCallResult(BaseModel):
    raw_output: Optional[Union[dict[str, Any], list[Any], str]]
    parsed_output: AITriageOutput
    error_message: Optional[str] = None
