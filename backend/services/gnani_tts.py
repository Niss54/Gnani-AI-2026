"""Gnani Timbre TTS Plugin for LiveKit Agents.

Implements livekit.agents.tts.TTS with WebSocket streaming synthesis
using Gnani's Timbre engine for ultra-low latency Indian-accent TTS.

Voices: Nalini (female primary), Deepak/Pranav/Arun (male specialist).
Supports dynamic language mirroring via update_options().
Falls back to REST synthesis if WebSocket streaming fails.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os

from livekit.agents import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions, tts, utils

logger = logging.getLogger("gnani_tts")

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_API_BASE_URL = os.getenv("GNANI_API_BASE_URL", "https://api.vachana.ai")

DEFAULT_MODEL = "timbre-v2.5"
DEFAULT_VOICE = "Nalini"
DEFAULT_LANGUAGE = "hi-IN"
DEFAULT_SAMPLE_RATE = 24000
NUM_CHANNELS = 1

# Fallback voice mapping for male voices
VOICE_MAPPING: dict[str, str] = {
    "arun": "Deepak",  # Maps Arun to Deepak in Timbre v2.5 catalog if needed
}


class GnaniChunkedStream(tts.ChunkedStream):
    """Handles streaming audio chunks from Gnani Timbre TTS."""

    def __init__(
        self,
        *,
        tts_instance: GnaniTTS,
        text: str,
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(tts=tts_instance, input_text=text, conn_options=conn_options)
        self._tts_instance = tts_instance
        self._text = text

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        """Stream synthesized audio chunks into LiveKit AudioEmitter."""
        request_id = utils.shortuuid()
        api_key = self._tts_instance._api_key or os.getenv("GNANI_API_KEY", "")

        output_emitter.initialize(
            request_id=request_id,
            sample_rate=self._tts_instance._sample_rate,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )

        if not api_key:
            logger.warning("GNANI_API_KEY not configured; skipping TTS synthesis.")
            output_emitter.flush()
            return

        # Try realtime WebSocket synthesis via official SDK
        try:
            from gnani.tts import SUPPORTED_VOICES, AudioConfig, GnaniTTSRealtimeClient

            client = GnaniTTSRealtimeClient(
                api_key=api_key,
                base_url=self._tts_instance._base_url,
            )

            # Resolve voice if alias passed
            voice_to_use = self._tts_instance._voice
            if voice_to_use not in SUPPORTED_VOICES:
                mapped = VOICE_MAPPING.get(voice_to_use.lower())
                voice_to_use = mapped or DEFAULT_VOICE

            cfg = AudioConfig(
                sample_rate=self._tts_instance._sample_rate,
                encoding="linear_pcm",
                num_channels=NUM_CHANNELS,
                container="raw",
            )

            chunk_count = 0
            async for chunk in client.synthesize(
                text=self._text,
                voice=voice_to_use,
                model=self._tts_instance._model,
                language=self._tts_instance._language,
                speed=self._tts_instance._speed,
                audio_config=cfg,
                request_id=request_id,
            ):
                if chunk:
                    output_emitter.push(chunk)
                    chunk_count += 1

            if chunk_count > 0:
                output_emitter.flush()
                return

        except Exception as exc:
            logger.warning(
                "Gnani Realtime TTS WebSocket streaming failed: %s; falling back to REST",
                exc,
            )

        # Fallback to REST synthesis
        await self._rest_fallback(output_emitter, request_id, api_key)

    async def _rest_fallback(
        self,
        output_emitter: tts.AudioEmitter,
        request_id: str,
        api_key: str,
    ) -> None:
        """Fallback REST synthesis if WebSocket stream fails."""
        try:
            from gnani.tts import SUPPORTED_VOICES, AudioConfig, GnaniTTSClient

            client = GnaniTTSClient(
                api_key=api_key,
                base_url=self._tts_instance._base_url,
            )

            voice_to_use = self._tts_instance._voice
            if voice_to_use not in SUPPORTED_VOICES:
                mapped = VOICE_MAPPING.get(voice_to_use.lower())
                voice_to_use = mapped or DEFAULT_VOICE

            cfg = AudioConfig(
                sample_rate=self._tts_instance._sample_rate,
                encoding="linear_pcm",
                num_channels=NUM_CHANNELS,
                container="raw",
            )

            loop = asyncio.get_running_loop()
            raw_audio = await loop.run_in_executor(
                None,
                lambda: client.synthesize(
                    text=self._text,
                    voice=voice_to_use,
                    model=self._tts_instance._model,
                    language=self._tts_instance._language,
                    speed=self._tts_instance._speed,
                    audio_config=cfg,
                    request_id=request_id,
                ),
            )

            if raw_audio:
                output_emitter.push(raw_audio)

        except Exception as exc:
            logger.error("Gnani REST TTS fallback error: %s", exc)

        finally:
            with contextlib.suppress(Exception):
                output_emitter.flush()


class GnaniTTS(tts.TTS):
    """Gnani Timbre Text-to-Speech plugin for LiveKit Agents.

    Ultra-low latency Indian-accent TTS with native Indic language support.
    Default Voices: Nalini (female), Deepak/Pranav (male).
    """

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        voice: str = DEFAULT_VOICE,
        language: str = DEFAULT_LANGUAGE,
        speed: float = 1.0,
        api_key: str = "",
        base_url: str = "",
        sample_rate: int = DEFAULT_SAMPLE_RATE,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=sample_rate,
            num_channels=NUM_CHANNELS,
        )
        self._model = model
        self._voice = voice
        self._language = language
        self._speed = speed
        self._api_key = api_key or GNANI_API_KEY
        self._base_url = (base_url or GNANI_API_BASE_URL).rstrip("/")
        self._sample_rate = sample_rate

    @property
    def model(self) -> str:
        """Returns the configured model name."""
        return self._model

    @property
    def provider(self) -> str:
        """Returns provider identifier."""
        return "gnani"

    @property
    def voice(self) -> str:
        """Returns the current voice name."""
        return self._voice

    @property
    def language(self) -> str:
        """Returns the current language code."""
        return self._language

    def update_options(
        self,
        *,
        voice: str | None = None,
        language: str | None = None,
        speed: float | None = None,
        locale: str | None = None,
    ) -> None:
        """Update TTS options mid-session (e.g., dynamic language mirroring)."""
        if voice is not None:
            self._voice = voice
        if language is not None:
            self._language = language
        if locale is not None:
            self._language = locale
        if speed is not None:
            self._speed = speed

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> GnaniChunkedStream:
        """Synthesize text using Gnani Timbre streaming engine."""
        return GnaniChunkedStream(
            tts_instance=self,
            text=text,
            conn_options=conn_options,
        )
