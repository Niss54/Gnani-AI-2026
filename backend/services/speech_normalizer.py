"""Deterministic spoken rendering. Financial values never pass through a rewrite LLM."""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal

try:
    from backend.contracts.voice import LanguageMode, VoiceError, require_minor_units
except ImportError:
    from contracts.voice import LanguageMode, VoiceError, require_minor_units


def normalize_transcript(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def spoken_money(minor: int, currency: str, language: LanguageMode) -> str:
    require_minor_units(minor, "amount")
    if currency not in {"INR", "USD"}:
        raise VoiceError("unsupported_currency", "Unsupported spoken currency")
    major, fraction = divmod(minor, 100)
    unit = ("rupaye" if language == "hi-en" else "rupees") if currency == "INR" else "US dollars"
    result = f"{major:,} {unit}"
    if fraction:
        result += f" {fraction} {'paise' if currency == 'INR' else 'cents'}"
    return result


def parse_explicit_amount(text: str) -> int | None:
    """Only parse a single explicit numeric amount. Ambiguity requires clarification."""
    without_dates = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", text)
    candidates = re.findall(r"(?<![\w.-])(\d[\d,]*(?:\.\d{1,2})?)\s*(thousand|hazar|hazaar|k\b|lakh)?", without_dates, re.I)
    if len(candidates) != 1:
        return None
    number, multiplier = candidates[0]
    amount = Decimal(number.replace(",", ""))
    if multiplier.lower() in {"thousand", "hazar", "hazaar", "k"}:
        amount *= 1000
    elif multiplier.lower() == "lakh":
        amount *= 100000
    minor = amount * 100
    return int(minor) if minor == minor.to_integral_value() and minor > 0 else None


def render_for_speech(text: str) -> str:
    """Strip markup/control tokens; preserve approved numbers and meaning."""
    cleaned = re.sub(r"<[^>]*>", "", unicodedata.normalize("NFC", text))
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()
