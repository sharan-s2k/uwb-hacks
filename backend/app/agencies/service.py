from sqlalchemy.orm import Session

from app.agencies.models import Agency

DEFAULT_AGENCIES: list[tuple[str, str, str]] = [
    ("Public Works", "PUBLIC_WORKS", "Road and sidewalk maintenance"),
    ("Electric Utility", "ELECTRIC_UTILITY", "Streetlights and electric infrastructure"),
    ("Transportation", "TRANSPORTATION", "Traffic signals and transportation systems"),
    ("Sanitation", "SANITATION", "Trash and illegal dumping"),
    ("Parks Department", "PARKS", "Parks and recreation infrastructure"),
    ("Water Services", "WATER_SERVICES", "Flooding and water leaks"),
    ("Code Enforcement", "CODE_ENFORCEMENT", "Code violations and graffiti"),
    ("Parking Enforcement", "PARKING_ENFORCEMENT", "Parking and abandoned vehicles"),
    ("Unassigned Civic Intake Queue", "UNASSIGNED", "Fallback intake queue"),
]


def ensure_default_agencies(db: Session) -> int:
    created = 0
    updated = 0
    for name, agency_type, description in DEFAULT_AGENCIES:
        existing = db.query(Agency).filter(Agency.agency_type == agency_type).first()
        if existing:
            # Normalize older seeded names like "Demo City Public Works".
            if existing.name != name:
                existing.name = name
                updated += 1
            if existing.description != description:
                existing.description = description
                updated += 1
            if not existing.is_registered:
                existing.is_registered = True
                updated += 1
            continue

        db.add(
            Agency(
                name=name,
                agency_type=agency_type,
                description=description,
                is_registered=True,
            )
        )
        created += 1

    if created or updated:
        db.commit()

    return created
