from typing import Optional

from pydantic import BaseModel


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    title: str
    category: str
    severity: str
    status: str
    assigned_agency_id: Optional[str]
    assigned_agency_name: str
    citizen_summary: str
    emergency_flag: bool


class AgencyTicketResponse(TicketResponse):
    location_text: Optional[str] = None
    safety_flag: bool = False
    accessibility_flag: bool = False


class ManualReportResponse(BaseModel):
    ticket: TicketResponse
    emergency_flag: bool
    message: str
