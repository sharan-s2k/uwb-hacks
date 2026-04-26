from sqlalchemy.orm import Session

from app.agencies.models import Agency
from app.enums import AgencyType, TicketCategory
from app.routing.rules import CATEGORY_TO_AGENCY_TYPE
from app.routing.schemas import RoutingResult


def route_ticket(
    db: Session,
    category: TicketCategory,
    recommended_agency_type: AgencyType,
) -> RoutingResult:
    target_agency_type = CATEGORY_TO_AGENCY_TYPE.get(category, recommended_agency_type)

    agency = (
        db.query(Agency)
        .filter(Agency.agency_type == target_agency_type.value, Agency.is_registered.is_(True))
        .first()
    )
    if agency:
        return RoutingResult(
            assigned_agency_id=str(agency.id),
            assigned_agency_name=agency.name,
            routing_status="ASSIGNED",
            routing_reason=f"Category {category.value} maps to {target_agency_type.value}",
        )

    fallback = db.query(Agency).filter(Agency.agency_type == AgencyType.UNASSIGNED.value).first()
    if fallback:
        return RoutingResult(
            assigned_agency_id=str(fallback.id),
            assigned_agency_name=fallback.name,
            routing_status="ROUTED_TO_FALLBACK",
            routing_reason=f"No registered agency for {target_agency_type.value}; routed to UNASSIGNED",
        )

    # Last resort: no fallback agency row exists.
    return RoutingResult(
        assigned_agency_id="",
        assigned_agency_name="Unassigned Civic Intake Queue",
        routing_status="UNASSIGNED_AGENCY_NOT_REGISTERED",
        routing_reason="No registered agency or UNASSIGNED fallback found",
    )
