import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from app.database import SessionLocal
from app.agencies.models import Agency
from app.tickets.models import Ticket
import uuid

def seed():
    db = SessionLocal()

    print("Seeding agencies...")
    agencies_data = [
        ("Demo City Public Works",        "PUBLIC_WORKS"),
        ("Demo City Electric Utility",    "ELECTRIC_UTILITY"),
        ("Demo City Sanitation",          "SANITATION"),
        ("Demo City Parks Department",    "PARKS"),
        ("Demo City Water Services",      "WATER_SERVICES"),
        ("Demo City Code Enforcement",    "CODE_ENFORCEMENT"),
        ("Unassigned Civic Intake Queue", "UNASSIGNED"),
    ]

    agencies = {}
    for name, atype in agencies_data:
        existing = db.query(Agency).filter_by(name=name).first()
        if not existing:
            a = Agency(name=name, agency_type=atype)
            db.add(a)
            db.flush()
            agencies[atype] = a.id
            print(f"  Created agency: {name}")
        else:
            agencies[atype] = existing.id
            print(f"  Already exists: {name}")

    print("Seeding tickets...")
    tickets_data = [
        ("Large pothole on Main Street",
         "There is a large pothole near Main and 4th Ave. Cars are swerving.",
         "POTHOLE", "PUBLIC_WORKS", "MEDIUM", "ROUTED", False, False),

        ("Pothole on Oak Avenue",
         "Deep pothole causing flat tires on Oak Ave near the school.",
         "POTHOLE", "PUBLIC_WORKS", "HIGH", "IN_PROGRESS", True, False),

        ("Broken sidewalk on 5th Street",
         "Sidewalk is cracked and lifted. Dangerous for pedestrians.",
         "SIDEWALK_OBSTRUCTION", "PUBLIC_WORKS", "MEDIUM", "NEEDS_MORE_INFO", False, True),

        ("Streetlight out near community center",
         "The streetlight outside the community center has been out for days.",
         "STREETLIGHT_OUTAGE", "ELECTRIC_UTILITY", "HIGH", "ROUTED", True, False),

        ("Multiple streetlights out on Elm St",
         "3 streetlights out on Elm Street between 2nd and 4th Ave.",
         "STREETLIGHT_OUTAGE", "ELECTRIC_UTILITY", "HIGH", "IN_PROGRESS", True, False),

        ("Streetlight flickering on Park Blvd",
         "Streetlight keeps flickering on and off near the park entrance.",
         "STREETLIGHT_OUTAGE", "ELECTRIC_UTILITY", "LOW", "RESOLVED", False, False),

        ("Illegal dumping behind the plaza",
         "Someone dumped furniture and trash bags behind the shopping plaza.",
         "ILLEGAL_DUMPING", "SANITATION", "MEDIUM", "ROUTED", False, False),

        ("Overflowing trash bins at bus stop",
         "Trash bins at Main St bus stop overflowing for 3 days.",
         "TRASH_OVERFLOW", "SANITATION", "LOW", "IN_PROGRESS", False, False),

        ("Flooding on Riverside Drive",
         "Water pooling and flooding the road after last night's rain.",
         "FLOODING", "WATER_SERVICES", "HIGH", "ROUTED", True, False),

        ("Water leak on Oak Street",
         "Water gushing from a crack in the road near Oak and 3rd.",
         "WATER_LEAK", "WATER_SERVICES", "CRITICAL", "IN_PROGRESS", True, False),

        ("Graffiti on underpass wall",
         "Large graffiti tags covering the entire underpass wall.",
         "GRAFFITI", "CODE_ENFORCEMENT", "LOW", "ROUTED", False, False),

        ("Abandoned vehicle on 2nd Ave",
         "Car has been parked without moving for 2 weeks on 2nd Ave.",
         "ABANDONED_VEHICLE", "CODE_ENFORCEMENT", "LOW", "RESOLVED", False, False),

        ("Park equipment damaged",
         "Swing set at Central Park has broken chains. Kids could get hurt.",
         "PARK_DAMAGE", "PARKS", "HIGH", "ROUTED", True, False),
    ]

    for i, (title, desc, category, atype, severity, status, safety, accessibility) in enumerate(tickets_data):
        existing = db.query(Ticket).filter_by(title=title).first()
        if not existing:
            t = Ticket(
                ticket_number=f"CFX-2026-{str(i+1).zfill(4)}",
                created_by=None,
                assigned_agency_id=agencies.get(atype),
                title=title,
                original_description=desc,
                category=category,
                severity=severity,
                status=status,
                routing_status="ASSIGNED",
                routing_reason=f"Mapped from {category}",
                citizen_summary=f"Your report '{title}' has been submitted and routed.",
                agency_summary=desc,
                suggested_action="Review and dispatch crew to address the issue.",
                safety_flag=safety,
                accessibility_flag=accessibility,
                emergency_flag=(severity == "CRITICAL"),
                public_visible=True,
                public_summary=title,
            )
            db.add(t)
            print(f"  Created ticket: {title}")

    db.commit()
    db.close()
    print("✅ Seed complete!")

if __name__ == "__main__":
    seed()
