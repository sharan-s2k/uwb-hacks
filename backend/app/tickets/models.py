import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String, unique=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=True)
    title = Column(String, nullable=False)
    original_description = Column(Text, nullable=False)
    voice_transcript = Column(Text, nullable=True)
    location_text = Column(String)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=False, default="OTHER")
    severity = Column(String, nullable=False, default="MEDIUM")
    status = Column(String, nullable=False, default="ROUTED")
    routing_status = Column(String, nullable=True)
    routing_reason = Column(String, nullable=True)
    citizen_summary = Column(Text)
    agency_summary = Column(Text)
    suggested_action = Column(Text)
    safety_flag = Column(Boolean, default=False)
    accessibility_flag = Column(Boolean, default=False)
    emergency_flag = Column(Boolean, default=False)
    ai_confidence = Column(Numeric(4, 3), nullable=True)
    public_visible = Column(Boolean, default=True)
    public_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TicketUpdate(Base):
    __tablename__ = "ticket_updates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    old_status = Column(String)
    new_status = Column(String)
    note = Column(Text)
    visibility = Column(String, default="INTERNAL")
    created_at = Column(DateTime, server_default=func.now())


class AITriageLog(Base):
    __tablename__ = "ai_triage_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    input_type = Column(String)
    raw_input = Column(Text)
    model_name = Column(String)
    raw_ai_output = Column(JSONB)
    validated_output = Column(JSONB)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
