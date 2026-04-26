from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.agencies.models import Agency
from app.ai.assistant import AssistantRequest, AssistantResponse, run_agency_assistant
from app.database import get_db
from app.tickets.models import Ticket
from app.tickets.schemas import AgencyTicketResponse

agency_list_router = APIRouter(prefix="/agencies", tags=["agencies"])
agency_ops_router = APIRouter(prefix="/agency", tags=["agency"])


@agency_list_router.get("")
def list_agencies(db: Session = Depends(get_db)):
    agencies = (
        db.query(Agency)
        .filter(Agency.is_registered == True)  # noqa: E712
        .order_by(Agency.name)
        .all()
    )
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "agency_type": a.agency_type,
            "description": a.description or "",
        }
        for a in agencies
    ]


def _build_agency_ticket(t: Ticket, db: Session) -> AgencyTicketResponse:
    agency = (
        db.query(Agency).filter(Agency.id == t.assigned_agency_id).first()
        if t.assigned_agency_id
        else None
    )
    return AgencyTicketResponse(
        id=str(t.id),
        ticket_number=t.ticket_number,
        title=t.title,
        category=t.category,
        severity=t.severity,
        status=t.status,
        assigned_agency_id=str(t.assigned_agency_id) if t.assigned_agency_id else None,
        assigned_agency_name=agency.name if agency else "Unassigned",
        citizen_summary=t.citizen_summary or "",
        emergency_flag=t.emergency_flag,
        location_text=t.location_text,
        image_url=t.image_url,
        safety_flag=t.safety_flag or False,
        accessibility_flag=t.accessibility_flag or False,
        created_at=t.created_at.isoformat() if t.created_at else None,
    )


@agency_ops_router.post("/assistant", response_model=AssistantResponse)
async def agency_assistant(body: AssistantRequest) -> AssistantResponse:
    return await run_agency_assistant(body)


@agency_ops_router.get("/tickets", response_model=list[AgencyTicketResponse])
def get_agency_tickets(
    agency_name: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)
    if agency_name:
        agency = db.query(Agency).filter(Agency.name == agency_name).first()
        if not agency:
            return []
        query = query.filter(Ticket.assigned_agency_id == agency.id)
    tickets = query.order_by(Ticket.created_at.desc()).all()
    return [_build_agency_ticket(t, db) for t in tickets]
