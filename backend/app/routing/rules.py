from app.enums import AgencyType, TicketCategory


CATEGORY_TO_AGENCY_TYPE: dict[TicketCategory, AgencyType] = {
    TicketCategory.STREETLIGHT_OUTAGE: AgencyType.ELECTRIC_UTILITY,
    TicketCategory.POTHOLE: AgencyType.PUBLIC_WORKS,
    TicketCategory.ROAD_DAMAGE: AgencyType.PUBLIC_WORKS,
    TicketCategory.SIDEWALK_OBSTRUCTION: AgencyType.PUBLIC_WORKS,
    TicketCategory.ACCESSIBILITY_BARRIER: AgencyType.PUBLIC_WORKS,
    TicketCategory.TRAFFIC_SIGNAL: AgencyType.TRANSPORTATION,
    TicketCategory.ILLEGAL_DUMPING: AgencyType.SANITATION,
    TicketCategory.TRASH_OVERFLOW: AgencyType.SANITATION,
    TicketCategory.PARK_DAMAGE: AgencyType.PARKS,
    TicketCategory.FLOODING: AgencyType.WATER_SERVICES,
    TicketCategory.WATER_LEAK: AgencyType.WATER_SERVICES,
    TicketCategory.GRAFFITI: AgencyType.CODE_ENFORCEMENT,
    TicketCategory.ABANDONED_VEHICLE: AgencyType.PARKING_ENFORCEMENT,
    TicketCategory.NOISE_COMPLAINT: AgencyType.CODE_ENFORCEMENT,
    TicketCategory.OTHER: AgencyType.UNASSIGNED,
}
