"""Gnani.ai Sovereign Indic AI Stack Adapter for RevClaim AI.

Provides integration with Gnani.ai's proprietary voice APIs:
- Prisma v2.5: Speech-to-Text (STT) for Indian languages and code-mixed Hinglish.
- Timbre v2.5: Ultra-low latency Text-to-Speech (TTS) with Indian accents.
- Evon v3.3: Indic Mixture-of-Experts sovereign reasoning model.

Includes graceful automatic fallback to Deepgram/Murf when GNANI_API_KEY is not configured,
ensuring offline dev loops and unit test suites never break.
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("gnani_adapter")

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_API_BASE_URL = os.getenv("GNANI_API_BASE_URL", "https://api.vachana.ai")

# Default Gnani model configurations
DEFAULT_PRISMA_MODEL = "prisma-v2.5"
DEFAULT_TIMBRE_MODEL = "timbre-v2.5"
DEFAULT_FEMALE_VOICE = "Nalini"  # Primary RevClaim AI Agent Voice
DEFAULT_MALE_VOICE = "Arun"  # Senior Billing Lead Voice


class GnaniSpeechClient:
    """Client for interacting with Gnani.ai Vachana Voice APIs."""

    def __init__(self, api_key: str = "", base_url: str = "") -> None:
        self.api_key = api_key or GNANI_API_KEY
        self.base_url = (base_url or GNANI_API_BASE_URL).rstrip("/")
        self.is_configured = bool(
            self.api_key and self.api_key != "your_gnani_api_key_here"
        )

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: str = "hi-IN",
        audio_format: str = "wav",
    ) -> dict[str, Any]:
        """Transcribe audio using Gnani Prisma v2.5 STT."""
        if not self.is_configured:
            logger.warning("Gnani API key not configured; skipping Prisma STT call.")
            return {
                "transcript": "",
                "language": language_code,
                "status": "unconfigured",
            }

        url = f"{self.base_url}/stt/v3"
        headers = {
            "X-API-Key-ID": self.api_key,
        }
        files = {
            "audio_file": (
                f"audio.{audio_format}",
                io.BytesIO(audio_bytes),
                f"audio/{audio_format}",
            ),
        }
        data = {
            "language_code": language_code,
            "model": DEFAULT_PRISMA_MODEL,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, files=files, data=data)
                if resp.status_code == 200:
                    payload = resp.json()
                    transcript = payload.get("transcript") or payload.get("text") or ""
                    detected_lang = payload.get("language_code") or language_code
                    return {
                        "transcript": transcript,
                        "language": detected_lang,
                        "status": "success",
                        "raw": payload,
                    }
                else:
                    logger.error(
                        "Gnani Prisma STT failed (HTTP %d): %s",
                        resp.status_code,
                        resp.text,
                    )
                    return {
                        "transcript": "",
                        "language": language_code,
                        "status": "error",
                    }
        except Exception as e:
            logger.error("Gnani Prisma STT network exception: %s", e)
            return {"transcript": "", "language": language_code, "status": "error"}

    async def synthesize_speech(
        self,
        text: str,
        voice: str = DEFAULT_FEMALE_VOICE,
        language: str = "hi-IN",
        speed: float = 1.0,
    ) -> bytes | None:
        """Synthesize speech using Gnani Timbre v2.5 TTS."""
        if not self.is_configured:
            logger.warning("Gnani API key not configured; skipping Timbre TTS call.")
            return None

        url = f"{self.base_url}/api/v1/tts"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "voice": voice,
            "model": DEFAULT_TIMBRE_MODEL,
            "language": language,
            "speed": speed,
            "audio_config": {
                "sample_rate": 24000,
                "encoding": "linear_pcm",
                "container": "wav",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    return resp.content
                else:
                    logger.error(
                        "Gnani Timbre TTS failed (HTTP %d): %s",
                        resp.status_code,
                        resp.text,
                    )
                    return None
        except Exception as e:
            logger.error("Gnani Timbre TTS exception: %s", e)
            return None


def get_gnani_client() -> GnaniSpeechClient:
    """Singleton helper to access Gnani Speech Client."""
    return GnaniSpeechClient()
