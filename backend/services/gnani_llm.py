"""Gnani Evon v3.3 LLM Plugin for LiveKit Agents.

Wraps Gnani's sovereign Indic Mixture-of-Experts LLM as a LiveKit-compatible
LLM using the OpenAI-compatible chat completions endpoint.

Evon v3.3: 30B parameter MoE, 128K context, native Indic language processing,
function/tool calling, and streaming token generation.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from livekit.plugins import openai

logger = logging.getLogger("gnani_llm")

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_API_BASE_URL = os.getenv("GNANI_API_BASE_URL", "https://api.vachana.ai")

DEFAULT_MODEL = "evon-v3.3"


class GnaniLLM(openai.LLM):
    """Gnani Evon v3.3 — Sovereign Indic LLM for LiveKit Agents.

    Uses the OpenAI-compatible chat completions endpoint at Gnani's Vachana API.
    Supports streaming, tool calling, and native Indic language processing.

    Integrates seamlessly into LiveKit's FallbackAdapter pipeline to route
    to Groq/Google if Evon API returns a transient error or scope limit.
    """

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        api_key: str = "",
        base_url: str = "",
        temperature: float = 0.2,
        parallel_tool_calls: bool = False,
        **kwargs: Any,
    ) -> None:
        key = api_key or GNANI_API_KEY or "placeholder_gnani_key"
        url = (base_url or f"{GNANI_API_BASE_URL}/llm/v1").rstrip("/")

        headers = kwargs.pop("extra_headers", {}) or {}
        if key:
            headers["X-API-Key-ID"] = key

        super().__init__(
            model=model,
            api_key=key,
            base_url=url,
            temperature=temperature,
            parallel_tool_calls=parallel_tool_calls,
            extra_headers=headers,
            _provider_fmt="gnani",
            **kwargs,
        )
        self._model = model
        logger.info("GnaniLLM initialized: model=%s, base_url=%s", model, url)

    @property
    def provider(self) -> str:
        """Returns provider identifier."""
        return "gnani"

    @property
    def model(self) -> str:
        """Returns model identifier."""
        return self._model


def create_gnani_llm(**kwargs: Any) -> GnaniLLM:
    """Factory function to create a Gnani Evon LLM instance."""
    return GnaniLLM(**kwargs)
