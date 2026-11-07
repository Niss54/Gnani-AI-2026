"""Gnani Prisma STT Plugin for LiveKit Agents.

Implements livekit.agents.stt.STT with native streaming support for
Gnani's Prisma speech recognition engine, optimized for Indian languages
(Hindi, English, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati,
Malayalam, Punjabi) and code-mixed Hinglish.

Supports both real-time WebSocket streaming via GnaniSTTStreamClient
and batch/REST recognition via GnaniSTTClient.
"""

from __future__ import annotations

import asyncio
import contextlib
import io
import logging
import os
from typing import Any

from livekit import rtc
from livekit.agents import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions, stt
from livekit.agents.stt import (
    SpeechData,
    SpeechEvent,
    SpeechEventType,
    STTCapabilities,
)
from livekit.agents.types import NOT_GIVEN, NotGivenOr
from livekit.agents.utils import AudioBuffer, audio

logger = logging.getLogger("gnani_stt")

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_API_BASE_URL = os.getenv("GNANI_API_BASE_URL", "https://api.vachana.ai")

DEFAULT_MODEL = "prisma-v2.5"
DEFAULT_LANGUAGE = "hi-IN"
DEFAULT_SAMPLE_RATE = 16000

# Mapping common alias names to valid Gnani language codes
LANGUAGE_MAP: dict[str, str] = {
    "hindi": "hi-IN",
    "hi": "hi-IN",
    "hi-in": "hi-IN",
    "english": "en-IN",
    "en": "en-IN",
    "en-in": "en-IN",
    "tamil": "ta-IN",
    "ta": "ta-IN",
    "ta-in": "ta-IN",
    "telugu": "te-IN",
    "te": "te-IN",
    "te-in": "te-IN",
    "kannada": "kn-IN",
    "kn": "kn-IN",
    "kn-in": "kn-IN",
    "marathi": "mr-IN",
    "mr": "mr-IN",
    "mr-in": "mr-IN",
    "bengali": "bn-IN",
    "bn": "bn-IN",
    "bn-in": "bn-IN",
    "gujarati": "gu-IN",
    "gu": "gu-IN",
    "gu-in": "gu-IN",
    "malayalam": "ml-IN",
    "ml": "ml-IN",
    "ml-in": "ml-IN",
    "punjabi": "pa-IN",
    "pa": "pa-IN",
    "pa-in": "pa-IN",
    "multi": "hi-IN",
    "hinglish": "hi-IN",
    "indic-auto": "hi-IN",
}


def normalize_language_code(lang: str | None) -> str:
    """Normalize input language string to supported BCP-47 code."""
    if not lang:
        return DEFAULT_LANGUAGE
    normalized = lang.strip().lower()
    return LANGUAGE_MAP.get(normalized, lang)


class GnaniSpeechStream(stt.SpeechStream):
    """Real-time bidirectional streaming recognition for Gnani Prisma STT."""

    def __init__(
        self,
        *,
        stt_instance: GnaniSTT,
        conn_options: APIConnectOptions,
        sample_rate: int,
        language: str,
    ) -> None:
        super().__init__(
            stt=stt_instance,
            conn_options=conn_options,
            sample_rate=sample_rate,
        )
        self._stt_instance = stt_instance
        self._language = normalize_language_code(language)
        self._sample_rate = sample_rate
        self._speaking = False

    async def _run(self) -> None:
        """Run bidirectional streaming: forward audio chunks and receive events."""
        api_key = self._stt_instance._api_key or os.getenv("GNANI_API_KEY", "")
        if not api_key:
            logger.warning("GNANI_API_KEY not configured; speech stream closing.")
            return

        try:
            from gnani.stt import (
                GnaniSTTStreamClient,
                StreamErrorEvent,
                StreamProcessingEvent,
                StreamTranscriptEvent,
            )
        except ImportError as e:
            logger.error("gnani-vachana package not installed: %s", e)
            return

        client_model = (
            self._stt_instance._model
            if self._stt_instance._model in ("prisma-v2.5", "prisma-v3.0")
            else None
        )

        stream_client = GnaniSTTStreamClient(
            api_key=api_key,
            language_code=self._language,
            model=client_model,
            sample_rate=self._sample_rate,
            base_url=self._stt_instance._base_url,
        )

        try:
            await stream_client.connect()
            logger.info(
                "Gnani STT stream connected (lang=%s, rate=%d, model=%s)",
                self._language,
                self._sample_rate,
                self._stt_instance._model,
            )
        except Exception as exc:
            logger.error("Failed to connect to Gnani STT stream: %s", exc)
            return

        # 512 samples per channel = 1024 bytes per 16-bit LE frame
        samples_per_frame = 512
        audio_stream = audio.AudioByteStream(
            sample_rate=self._sample_rate,
            num_channels=1,
            samples_per_channel=samples_per_frame,
        )

        async def send_audio_task() -> None:
            """Push audio chunks from input channel to Gnani stream."""
            try:
                async for data in self._input_ch:
                    if isinstance(data, rtc.AudioFrame):
                        frames = audio_stream.write(data.data.tobytes())
                        for frame in frames:
                            await stream_client.send_audio(frame.data.tobytes())
                    elif isinstance(data, self._FlushSentinel):
                        flushed_frames = audio_stream.flush()
                        for frame in flushed_frames:
                            await stream_client.send_audio(frame.data.tobytes())
            except asyncio.CancelledError:
                pass
            except Exception as err:
                logger.error("Gnani STT send audio error: %s", err)
            finally:
                with contextlib.suppress(Exception):
                    await stream_client.close()

        async def recv_events_task() -> None:
            """Receive transcription events from Gnani and emit SpeechEvents."""
            try:
                async for event in stream_client.events():
                    if isinstance(event, StreamProcessingEvent):
                        if not self._speaking:
                            self._speaking = True
                            self._event_ch.send_nowait(
                                SpeechEvent(type=SpeechEventType.START_OF_SPEECH)
                            )
                    elif isinstance(event, StreamTranscriptEvent):
                        transcript = event.text.strip()
                        if transcript:
                            detected_lang = (
                                event.detected_language_code or self._language
                            )
                            speech_data = SpeechData(
                                text=transcript,
                                language=detected_lang,
                            )
                            # Emit final transcript
                            self._event_ch.send_nowait(
                                SpeechEvent(
                                    type=SpeechEventType.FINAL_TRANSCRIPT,
                                    alternatives=[speech_data],
                                )
                            )
                        if self._speaking:
                            self._speaking = False
                            self._event_ch.send_nowait(
                                SpeechEvent(type=SpeechEventType.END_OF_SPEECH)
                            )
                    elif isinstance(event, StreamErrorEvent):
                        logger.warning(
                            "Gnani STT stream error event: %s", event.message
                        )
            except asyncio.CancelledError:
                pass
            except Exception as err:
                logger.error("Gnani STT recv event error: %s", err)

        send_task = asyncio.create_task(send_audio_task())
        recv_task = asyncio.create_task(recv_events_task())

        _done, pending = await asyncio.wait(
            [send_task, recv_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

        with contextlib.suppress(Exception):
            await stream_client.close()


class GnaniSTT(stt.STT):
    """Gnani Prisma Speech-to-Text plugin for LiveKit Agents.

    Supports both streaming (WebSocket) and batch (REST) recognition.
    Optimized for Indian languages and code-mixed Hinglish.
    """

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        language: str = DEFAULT_LANGUAGE,
        api_key: str = "",
        base_url: str = "",
        sample_rate: int = DEFAULT_SAMPLE_RATE,
    ) -> None:
        super().__init__(
            capabilities=STTCapabilities(
                streaming=True,
                interim_results=True,
            )
        )
        self._model = model
        self._language = normalize_language_code(language)
        self._api_key = api_key or GNANI_API_KEY
        self._base_url = (base_url or GNANI_API_BASE_URL).rstrip("/")
        self._sample_rate = sample_rate

    @property
    def model(self) -> str:
        """Returns the configured model name."""
        return self._model

    @property
    def language(self) -> str:
        """Returns the default language code."""
        return self._language

    @property
    def provider(self) -> str:
        """Returns provider identifier."""
        return "gnani"

    def stream(
        self,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> GnaniSpeechStream:
        """Create a new streaming recognition session."""
        lang = self._language if language is NOT_GIVEN or language is None else language
        return GnaniSpeechStream(
            stt_instance=self,
            conn_options=conn_options,
            sample_rate=self._sample_rate,
            language=str(lang),
        )

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> SpeechEvent:
        """Perform batch recognition using Gnani Prisma REST API."""
        target_lang = (
            self._language
            if language is NOT_GIVEN or language is None
            else normalize_language_code(str(language))
        )
        combined_frame = rtc.combine_audio_frames(buffer)
        wav_bytes = combined_frame.to_wav_bytes()

        # Try official SDK first
        try:
            from gnani.stt import GnaniSTTClient

            client = GnaniSTTClient(
                api_key=self._api_key,
                base_url=self._base_url,
            )
            model_arg = (
                self._model if self._model in ("prisma-v2.5", "prisma-v3.0") else None
            )
            loop = asyncio.get_running_loop()
            result: dict[str, Any] = await loop.run_in_executor(
                None,
                lambda: client.transcribe(
                    audio=io.BytesIO(wav_bytes),
                    language_code=target_lang,
                    model=model_arg,
                ),
            )
            transcript = result.get("transcript") or result.get("text") or ""
            detected_lang = result.get("language_code") or target_lang
            return SpeechEvent(
                type=SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[SpeechData(text=transcript, language=detected_lang)],
            )
        except Exception as exc:
            logger.warning(
                "Gnani SDK batch transcribe failed, trying HTTP fallback: %s", exc
            )

        # HTTP Fallback
        import httpx

        url = f"{self._base_url}/stt/v3"
        headers = {"X-API-Key-ID": self._api_key}
        files = {
            "audio_file": ("audio.wav", io.BytesIO(wav_bytes), "audio/wav"),
        }
        data = {
            "language_code": target_lang,
            "model": self._model,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                resp = await http_client.post(
                    url, headers=headers, files=files, data=data
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    transcript = payload.get("transcript") or payload.get("text") or ""
                    detected_lang = payload.get("language_code") or target_lang
                    return SpeechEvent(
                        type=SpeechEventType.FINAL_TRANSCRIPT,
                        alternatives=[
                            SpeechData(text=transcript, language=detected_lang)
                        ],
                    )
                else:
                    logger.error(
                        "Gnani REST STT failed (HTTP %d): %s",
                        resp.status_code,
                        resp.text,
                    )
        except Exception as e:
            logger.error("Gnani REST STT exception: %s", e)

        return SpeechEvent(
            type=SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[SpeechData(text="", language=target_lang)],
        )
