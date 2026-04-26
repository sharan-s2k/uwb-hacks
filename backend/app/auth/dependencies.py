from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.users.models import User


@dataclass
class CurrentUser:
    id: UUID
    auth0_sub: str
    email: str
    role: str
    agency_id: UUID | None


def get_current_user(
    db: Session = Depends(get_db),
    x_auth0_sub: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
) -> CurrentUser:
    auth0_sub = x_auth0_sub or "dev|citizen@example.com"
    email = x_user_email or "citizen@example.com"

    user = db.query(User).filter(User.auth0_sub == auth0_sub).first()
    if not user:
        user = User(
            auth0_sub=auth0_sub,
            email=email,
            name="Dev Citizen",
            role="citizen",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return CurrentUser(
        id=user.id,
        auth0_sub=user.auth0_sub,
        email=user.email,
        role=user.role,
        agency_id=user.agency_id,
    )
