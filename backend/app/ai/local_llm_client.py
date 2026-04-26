import json
from typing import Any, Union

import httpx

from app.config import settings


async def call_local_llm(prompt: str) -> Union[dict[str, Any], list[Any], str]:
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }

    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

    text = data.get("response", "{}")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("Local LLM response was not valid JSON") from exc
