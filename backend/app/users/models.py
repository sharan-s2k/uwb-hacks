import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth0_sub = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    name = Column(String)
    role = Column(String, nullable=False, default="citizen")
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
