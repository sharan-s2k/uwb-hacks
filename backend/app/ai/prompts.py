from app.ai.schemas import AITriageInput


def build_triage_prompt(payload: AITriageInput) -> str:
    return f"""
You are a civic issue triage engine.
Return JSON only. Do not return markdown.
Do not invent details that are not present in the input.
Use category OTHER if uncertain.
Use severity CRITICAL only for immediate danger.

Allowed category values:
POTHOLE, ROAD_DAMAGE, STREETLIGHT_OUTAGE, TRAFFIC_SIGNAL, SIDEWALK_OBSTRUCTION,
ACCESSIBILITY_BARRIER, ILLEGAL_DUMPING, TRASH_OVERFLOW, PARK_DAMAGE, FLOODING,
GRAFFITI, ABANDONED_VEHICLE, NOISE_COMPLAINT, WATER_LEAK, OTHER

Allowed recommendedAgencyType values:
PUBLIC_WORKS, ELECTRIC_UTILITY, TRANSPORTATION, SANITATION, PARKS,
WATER_SERVICES, CODE_ENFORCEMENT, PARKING_ENFORCEMENT, UNASSIGNED

Allowed severity values:
LOW, MEDIUM, HIGH, CRITICAL

Return exactly this JSON shape:
{{
  "title": "string",
  "category": "enum",
  "recommendedAgencyType": "enum",
  "severity": "enum",
  "citizenSummary": "string",
  "agencySummary": "string",
  "suggestedAction": "string",
  "safetyFlag": true,
  "accessibilityFlag": false,
  "emergencyFlag": false,
  "missingInformation": ["string"],
  "confidence": 0.0
}}

Input:
- inputType: {payload.input_type}
- description: {payload.description}
- locationText: {payload.location_text}
- imageUrl: {payload.image_url}
""".strip()
