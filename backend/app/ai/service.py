import httpx
from typing import Optional

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
    last_error: Optional[str] = None

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


_LANGUAGE_NAMES: dict[str, str] = {
    "es": "Spanish",
    "zh": "Chinese (Mandarin)",
    "tl": "Tagalog",
    "vi": "Vietnamese",
}


async def translate_transcript_to_english(transcript: str, language_code: str) -> str:
    """
    Translates a non-English conversation transcript to English using Gemma.
    Preserves Agent:/Citizen: speaker labels. Falls back to the original on failure.
    """
    lang_name = _LANGUAGE_NAMES.get(language_code, language_code)
    prompt = (
        f"Translate the following conversation transcript from {lang_name} to English.\n"
        "Keep the 'Agent:' and 'Citizen:' speaker labels exactly as they are.\n"
        "Return only the translated transcript. Do not add any explanation or commentary.\n\n"
        f"{transcript}\n\nTranslation:"
    )
    try:
        url = f"{settings.ollama_base_url}/api/generate"
        payload = {"model": settings.ollama_model, "prompt": prompt, "stream": False}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        translated = data.get("response", "").strip()
        return translated if translated else transcript
    except Exception:  # noqa: BLE001
        return transcript


async def extract_location_from_transcript(transcript: str) -> str:
    """
    Uses Gemma to extract the location mentioned in a voice conversation transcript.
    Returns a plain-text location string, or 'Location not specified' on failure.
    """
    prompt = (
        "Extract the specific location mentioned in the conversation below.\n"
        "Return only the location as a short string (street address, intersection, or landmark).\n"
        "If no specific location is mentioned, return: Location not specified\n"
        "Do not include any explanation or extra text.\n\n"
        f"Conversation:\n{transcript}\n\n"
        "Location:"
    )

    try:
        url = f"{settings.ollama_base_url}/api/generate"
        payload = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
            # No "format": "json" — we want a plain text response here
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        location = data.get("response", "").strip().rstrip(".")
        # Strip verbose preambles the model sometimes adds despite instructions.
        # e.g. "The specific location mentioned in the conversation is Ananagar, Chennai"
        for marker in (" is ", " are "," Is ", " Are "):
            if marker in location:
                location = location.split(marker)[-1].strip().rstrip(".")
                break
        return location if location else "Location not specified"
    except Exception:  # noqa: BLE001
        return "Location not specified"
