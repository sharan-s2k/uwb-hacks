from pydantic import BaseModel


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    title: str
    category: str
    severity: str
    status: str
    assigned_agency_id: str | None
    assigned_agency_name: str
    citizen_summary: str
    emergency_flag: bool


class ManualReportResponse(BaseModel):
    ticket: TicketResponse
    emergency_flag: bool
    message: str
