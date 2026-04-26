from pydantic import BaseModel

from app.enums import AgencyType, TicketCategory


class RoutingInput(BaseModel):
    category: TicketCategory
    recommended_agency_type: AgencyType
    location_text: str


class RoutingResult(BaseModel):
    assigned_agency_id: str
    assigned_agency_name: str
    routing_status: str
    routing_reason: str
