import json
from typing import Optional

import httpx
from pydantic import BaseModel

from app.config import settings


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssistantTicket(BaseModel):
    id: str
    ticket_number: str
    title: str
    status: str
    category: str
    severity: str
    location_text: Optional[str] = None


class AssistantAction(BaseModel):
    type: str                      # "move_status" | "forward_department"
    ticket_ids: list[str]
    new_status: Optional[str] = None
    department: Optional[str] = None


class AssistantRequest(BaseModel):
    message: str
    department: str
    tickets: list[AssistantTicket]
    agencies: list[str]            # available department names


class AssistantResponse(BaseModel):
    message: str
    actions: list[AssistantAction] = []


# ── Prompt ────────────────────────────────────────────────────────────────────

def _build_prompt(req: AssistantRequest) -> str:
    ticket_lines = "\n".join(
        f"  UUID:{t.id} | #{t.ticket_number} | {t.title!r} | {t.status} | {t.category}"
        for t in req.tickets[:25]
    )
    dept_list = ", ".join(req.agencies[:20])

    return (
        f"You are an AI assistant for the {req.department} department. "
        f"You help staff manage civic issue tickets.\n\n"
        f"TICKETS IN THIS DEPARTMENT:\n{ticket_lines}\n\n"
        f"VALID STATUSES: ROUTED, IN_PROGRESS, NEEDS_MORE_INFO, RESOLVED\n"
        f"DEPARTMENTS YOU CAN FORWARD TO: {dept_list}\n\n"
        f"STAFF MESSAGE: {req.message}\n\n"
        f"Respond with a JSON object using ONLY this structure:\n"
        f'{{"message":"your reply","actions":[]}}\n\n'
        f"Each action must be one of:\n"
        f'{{"type":"move_status","ticket_ids":["id"],"new_status":"STATUS"}}\n'
        f'{{"type":"forward_department","ticket_ids":["id"],"department":"Name"}}\n\n'
        f"Rules:\n"
        f"- ticket_ids must use the UUID values (UUID:...) from the list, NOT the #ticket_number.\n"
        f"- Only use department names from the DEPARTMENTS list.\n"
        f"- Only use valid status values.\n"
        f"- Return empty actions array if just answering a question or if unclear.\n"
        f"- Do not include text outside the JSON object."
    )


# ── LLM call ─────────────────────────────────────────────────────────────────

async def run_agency_assistant(req: AssistantRequest) -> AssistantResponse:
    prompt = _build_prompt(req)

    for _ in range(3):
        try:
            url = f"{settings.ollama_base_url}/api/generate"
            payload = {
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            }
            async with httpx.AsyncClient(timeout=45) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()

            raw = json.loads(data.get("response", "{}"))

            actions: list[AssistantAction] = []
            for a in raw.get("actions", []):
                try:
                    actions.append(AssistantAction(**a))
                except Exception:  # noqa: BLE001
                    pass

            return AssistantResponse(
                message=raw.get("message", "Done."),
                actions=actions,
            )
        except Exception:  # noqa: BLE001
            pass

    return AssistantResponse(
        message="I'm having trouble processing that right now. Please try again.",
        actions=[],
    )
