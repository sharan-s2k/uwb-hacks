from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.ai.schemas import AITriageInput
from app.ai.service import extract_location_from_transcript, triage_report
from app.auth.dependencies import CurrentUser
from app.routing.service import route_ticket
from app.storage.service import save_report_image
from app.tickets.schemas import ManualReportResponse, TicketResponse
from app.tickets.service import create_ticket


def _build_ticket_response(ticket, routing) -> ManualReportResponse:
    ticket_out = TicketResponse(
        id=str(ticket.id),
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        category=ticket.category,
        severity=ticket.severity,
        status=ticket.status,
        assigned_agency_id=str(ticket.assigned_agency_id) if ticket.assigned_agency_id else None,
        assigned_agency_name=routing.assigned_agency_name,
        citizen_summary=ticket.citizen_summary or "",
        emergency_flag=ticket.emergency_flag,
    )
    return ManualReportResponse(
        ticket=ticket_out,
        emergency_flag=ticket.emergency_flag,
        message="Report submitted successfully and routed to the appropriate agency.",
    )


async def create_manual_report(
    db: Session,
    user: CurrentUser,
    description: str,
    location_text: str,
    image_file: UploadFile | None,
) -> ManualReportResponse:
    image_url = await save_report_image(image_file)

    intake_payload = AITriageInput(
        description=description,
        location_text=location_text,
        image_url=image_url,
        input_type="MANUAL",
    )
    triage = await triage_report(intake_payload)
    routing = route_ticket(
        db=db,
        category=triage.parsed_output.category,
        recommended_agency_type=triage.parsed_output.recommended_agency_type,
    )
    ticket = create_ticket(
        db=db,
        user_id=user.id,
        intake_payload=intake_payload,
        triage_result=triage,
        routing_result=routing,
    )
    return _build_ticket_response(ticket, routing)


async def create_voice_report(
    db: Session,
    user: CurrentUser,
    conversation_transcript: str,
    image_file: UploadFile | None = None,
) -> ManualReportResponse:
    """
    Runs the same triage → routing → ticket pipeline as the manual flow.
    Location is extracted from the transcript by Gemma — no manual input required.
    """
    image_url = await save_report_image(image_file)

    location_text = await extract_location_from_transcript(conversation_transcript)

    intake_payload = AITriageInput(
        description=conversation_transcript,
        location_text=location_text,
        image_url=image_url,
        input_type="VOICE",
    )
    triage = await triage_report(intake_payload)
    routing = route_ticket(
        db=db,
        category=triage.parsed_output.category,
        recommended_agency_type=triage.parsed_output.recommended_agency_type,
    )
    ticket = create_ticket(
        db=db,
        user_id=user.id,
        intake_payload=intake_payload,
        triage_result=triage,
        routing_result=routing,
        voice_transcript=conversation_transcript,
    )
    return _build_ticket_response(ticket, routing)
