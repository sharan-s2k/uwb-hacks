from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.schemas import AITriageInput, AITriageOutput, TriageCallResult
from app.routing.schemas import RoutingResult
from app.tickets.models import Ticket


def _next_ticket_number(db: Session) -> str:
    year = 2026
    count = db.query(func.count(Ticket.id)).scalar() or 0
    return f"CFX-{year}-{str(count + 1).zfill(4)}"


def create_ticket(
    db: Session,
    user_id: UUID,
    intake_payload: AITriageInput,
    triage_result: TriageCallResult,
    routing_result: RoutingResult,
    voice_transcript: str | None = None,
) -> Ticket:
    triage: AITriageOutput = triage_result.parsed_output
    assigned_agency_uuid = (
        UUID(routing_result.assigned_agency_id) if routing_result.assigned_agency_id else None
    )
    ticket = Ticket(
        ticket_number=_next_ticket_number(db),
        created_by=user_id,
        assigned_agency_id=assigned_agency_uuid,
        title=triage.title,
        original_description=intake_payload.description,
        voice_transcript=voice_transcript,
        location_text=intake_payload.location_text,
        image_url=intake_payload.image_url,
        category=triage.category.value,
        severity=triage.severity.value,
        status="ROUTED",
        routing_status=routing_result.routing_status,
        routing_reason=routing_result.routing_reason,
        citizen_summary=triage.citizen_summary,
        agency_summary=triage.agency_summary,
        suggested_action=triage.suggested_action,
        safety_flag=triage.safety_flag,
        accessibility_flag=triage.accessibility_flag,
        emergency_flag=triage.emergency_flag,
        ai_confidence=Decimal(str(triage.confidence)),
        public_visible=True,
        public_summary=triage.citizen_summary,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
