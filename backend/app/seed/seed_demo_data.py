import uuid
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.agencies.models import Agency
from app.users.models import User
from app.tickets.models import Ticket

def seed():
    db = SessionLocal()

    # Seed Agencies
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
        else:
            agencies[atype] = existing.id

    # Seed Users
    staff_data = [
        ("publicworks@demo.city", "Public Works Staff", "agency_staff", "PUBLIC_WORKS"),
        ("electric@demo.city",    "Electric Staff",     "agency_staff", "ELECTRIC_UTILITY"),
        ("sanitation@demo.city",  "Sanitation Staff",   "agency_staff", "SANITATION"),
        ("parks@demo.city",       "Parks Staff",        "agency_staff", "PARKS"),
        ("water@demo.city",       "Water Staff",        "agency_staff", "WATER_SERVICES"),
        ("code@demo.city",        "Code Staff",         "agency_staff", "CODE_ENFORCEMENT"),
        ("admin@demo.city",       "System Admin",       "admin",        None),
        ("citizen@demo.city",     "Demo Citizen",       "citizen",      None),
    ]

    citizen_id = None
    for email, name, role, atype in staff_data:
        existing = db.query(User).filter_by(email=email).first()
        if not existing:
            u = User(
                auth0_sub=f"seed|{email}",
                email=email,
                name=name,
                role=role,
                agency_id=agencies.get(atype) if atype else None
            )
            db.add(u)
            db.flush()
            if role == "citizen":
                citizen_id = u.id
        else:
            if role == "citizen":
                citizen_id = existing.id

    # Seed Sample Tickets
    if citizen_id:
        tickets_data = [
            ("Large pothole on Main Street",          "There is a large pothole near Main Street and 4th Avenue.", "POTHOLE",            "PUBLIC_WORKS",    "MEDIUM"),
            ("Streetlight out near community center", "The streetlight outside the community center has been out.", "STREETLIGHT_OUTAGE", "ELECTRIC_UTILITY","HIGH"),
            ("Illegal dumping behind the plaza",      "Someone dumped furniture and trash bags behind the plaza.",  "ILLEGAL_DUMPING",    "SANITATION",      "MEDIUM"),
            ("Flooding on Riverside Drive",           "Water is pooling and flooding the road after rain.",         "FLOODING",           "WATER_SERVICES",  "HIGH"),
            ("Graffiti on the underpass wall",        "There is graffiti covering the entire underpass wall.",      "GRAFFITI",           "CODE_ENFORCEMENT","LOW"),
        ]

        for i, (title, desc, category, atype, severity) in enumerate(tickets_data):
            t = Ticket(
                ticket_number=f"CFX-2026-{str(i+1).zfill(4)}",
                created_by=citizen_id,
                assigned_agency_id=agencies.get(atype),
                title=title,
                original_description=desc,
                category=category,
                severity=severity,
                status="ROUTED",
                routing_status="ASSIGNED",
                citizen_summary=f"Your report about '{title}' has been submitted.",
                agency_summary=desc,
                suggested_action="Review and dispatch a crew to address the issue.",
                public_visible=True,
                public_summary=title,
            )
            db.add(t)

    db.commit()
    db.close()
    print("✅ Seed complete!")

if __name__ == "__main__":
    seed()
