from app.ai.local_llm_client import call_local_llm
from app.ai.prompts import build_triage_prompt
from app.ai.schemas import AITriageInput, AITriageOutput, TriageCallResult
from app.config import settings
from app.enums import AgencyType, Severity, TicketCategory


def fallback_triage_output() -> AITriageOutput:
    return AITriageOutput(
        title="Manual review required",
        category=TicketCategory.OTHER,
        recommended_agency_type=AgencyType.UNASSIGNED,
        severity=Severity.MEDIUM,
        citizen_summary="Your report has been submitted for manual review.",
        agency_summary="AI triage failed. Please manually review the submitted issue.",
        suggested_action="Review and assign to the appropriate agency.",
        safety_flag=False,
        accessibility_flag=False,
        emergency_flag=False,
        missing_information=[],
        confidence=0,
    )


def _normalize_keys(raw: dict) -> dict:
    # Accept camelCase output and map to pydantic snake_case fields.
    return {
        "title": raw.get("title"),
        "category": raw.get("category"),
        "recommended_agency_type": raw.get("recommendedAgencyType", raw.get("recommended_agency_type")),
        "severity": raw.get("severity"),
        "citizen_summary": raw.get("citizenSummary", raw.get("citizen_summary")),
        "agency_summary": raw.get("agencySummary", raw.get("agency_summary")),
        "suggested_action": raw.get("suggestedAction", raw.get("suggested_action")),
        "safety_flag": raw.get("safetyFlag", raw.get("safety_flag", False)),
        "accessibility_flag": raw.get("accessibilityFlag", raw.get("accessibility_flag", False)),
        "emergency_flag": raw.get("emergencyFlag", raw.get("emergency_flag", False)),
        "missing_information": raw.get("missingInformation", raw.get("missing_information", [])),
        "confidence": raw.get("confidence", 0),
    }


async def triage_report(payload: AITriageInput) -> TriageCallResult:
    prompt = build_triage_prompt(payload)
    last_error: str | None = None

    for _ in range(settings.ai_triage_retry_count + 1):
        try:
            raw = await call_local_llm(prompt)
            normalized = _normalize_keys(raw if isinstance(raw, dict) else {})
            parsed = AITriageOutput.model_validate(normalized)
            return TriageCallResult(raw_output=raw, parsed_output=parsed, error_message=None)
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)

    fallback = fallback_triage_output()
    return TriageCallResult(raw_output=None, parsed_output=fallback, error_message=last_error)
