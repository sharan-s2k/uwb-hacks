import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.tickets.models import Ticket
from app.tickets.schemas import TicketResponse

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/my", response_model=list[TicketResponse])
def get_my_tickets(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    tickets = (
        db.query(Ticket)
        .filter(Ticket.created_by == user.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    return [
        TicketResponse(
            id=str(t.id),
            ticket_number=t.ticket_number,
            title=t.title,
            category=t.category,
            severity=t.severity,
            status=t.status,
            assigned_agency_id=str(t.assigned_agency_id) if t.assigned_agency_id else None,
            assigned_agency_name=_agency_name(t, db),
            citizen_summary=t.citizen_summary or "",
            emergency_flag=t.emergency_flag,
        )
        for t in tickets
    ]


class _StatusBody(BaseModel):
    status: str


@router.patch("/{ticket_id}/status")
def update_ticket_status(
    ticket_id: str,
    body: _StatusBody,
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == _uuid.UUID(ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = body.status
    db.commit()
    return {"ok": True}


def _agency_name(ticket: Ticket, db: Session) -> str:
    if not ticket.assigned_agency_id:
        return "Unassigned"
    from app.agencies.models import Agency
    agency = db.query(Agency).filter(Agency.id == ticket.assigned_agency_id).first()
    return agency.name if agency else "Unassigned"
