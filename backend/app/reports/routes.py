from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.reports.service import create_manual_report, create_voice_report
from app.tickets.schemas import ManualReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/manual", response_model=ManualReportResponse)
async def submit_manual_report(
    description: str = Form(...),
    location: str | None = Form(default=None),
    location_text: str | None = Form(default=None),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    normalized_location = location_text or location or ""
    return await create_manual_report(
        db=db,
        user=user,
        description=description,
        location_text=normalized_location,
        image_file=photo,
    )


@router.post("/voice/finalize", response_model=ManualReportResponse)
async def finalize_voice_report(
    conversation_transcript: str = Form(...),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Called by the frontend after the ElevenLabs conversation ends.
    Accepts the full conversation transcript and runs it through the same
    Gemma triage + routing pipeline as manual reports.
    Location is extracted from the transcript automatically by Gemma.
    """
    return await create_voice_report(
        db=db,
        user=user,
        conversation_transcript=conversation_transcript,
        image_file=photo,
    )
