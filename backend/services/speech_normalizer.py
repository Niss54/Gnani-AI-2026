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


# Acoustic phonetic dictionary for TTS pronunciation calibration
PHONETIC_GLOSSARY: dict[str, str] = {
    "GST": "G-S-T",
    "MSME": "M-S-M-E",
    "MSMED": "M-S-M-E Act",
    "PTP": "P-T-P",
    "UPI": "U-P-I",
    "NEFT": "N-E-F-T",
    "RTGS": "R-T-G-S",
    "RBI": "R-B-I",
    "TDS": "T-D-S",
    "EMI": "E-M-I",
    "PO": "P-O",
    "UTR": "U-T-R",
}

INDIC_PHONETIC_SPELLINGS: dict[str, str] = {
    "rupaye": "roo-pa-ye",
    "namaste": "na-ma-stay",
    "shukriya": "shook-ree-ya",
    "dhanyawad": "dhan-ya-waad",
    "kripya": "krip-ya",
    "samajh": "sa-majh",
    "chahiye": "chaa-hi-ye",
    "hazar": "ha-zaar",
}


def apply_phonetic_normalization(text: str, language: LanguageMode = "en-IN") -> str:
    """Normalize acronyms, currency symbols, and Indic terms to ensure clear TTS pronunciation.
    
    Training the negotiation LLM does not fix TTS pronunciation; explicit phonetic mapping is required.
    """
    normalized = render_for_speech(text)

    # 1. Expand currency symbols
    if language == "hi-en":
        normalized = re.sub(r"₹\s*(\d[\d,]*)", r"\1 rupaye", normalized)
        normalized = re.sub(r"Rs\.?\s*(\d[\d,]*)", r"\1 rupaye", normalized, flags=re.I)
    else:
        normalized = re.sub(r"₹\s*(\d[\d,]*)", r"\1 rupees", normalized)
        normalized = re.sub(r"Rs\.?\s*(\d[\d,]*)", r"\1 rupees", normalized, flags=re.I)
    normalized = re.sub(r"\$\s*(\d[\d,]*)", r"\1 US dollars", normalized)

    # 2. Expand banking/tax acronyms with hyphenated pauses
    for acronym, phonetic in PHONETIC_GLOSSARY.items():
        normalized = re.sub(rf"\b{acronym}\b", phonetic, normalized)

    return normalized.strip()


def insert_conversational_pauses(text: str, engine: str = "plain") -> str:
    """Insert conversational breathing and comprehension pauses after salutations and questions.
    
    Prevents TTS rushing past key financial questions or amounts.
    """
    result = text
    # Pacing after common salutations
    result = re.sub(r"\b(Namaste|Hello|Hi)\b([,!]?)", r"\1,\2 ", result, flags=re.I)

    # Pacing before financial figures to ensure listener comprehension
    result = re.sub(r"(\b(?:amount|balance|total|due)\s+(?:of|is)?\s*)([\d,]+\s*(?:rupees|rupaye|US dollars))", r"\1 ... \2", result, flags=re.I)

    # Pacing before closing question
    result = re.sub(r"\?(\s*)", r"? ... \1", result)

    if engine == "ssml":
        # Convert ellipses to explicit SSML break tags
        result = result.replace(" ... ", '<break time="350ms"/>')

    return re.sub(r"\s+", " ", result).strip()


def evaluate_speech_clarity(reference_transcript: str, decoded_transcript: str) -> dict:
    """Evaluate speech transcription / synthesis fidelity: Word Error Rate (WER) and missed words."""
    ref_words = re.findall(r"\b\w+\b", reference_transcript.lower())
    dec_words = re.findall(r"\b\w+\b", decoded_transcript.lower())

    ref_set = set(ref_words)
    dec_set = set(dec_words)

    missed_words = [w for w in ref_words if w not in dec_set]
    extra_words = [w for w in dec_words if w not in ref_set]

    # Calculate Levenshtein word distance for exact WER
    d = [[0] * (len(dec_words) + 1) for _ in range(len(ref_words) + 1)]
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(dec_words) + 1):
        d[0][j] = j

    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(dec_words) + 1):
            cost = 0 if ref_words[i - 1] == dec_words[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)

    word_distance = d[len(ref_words)][len(dec_words)]
    wer = round(word_distance / len(ref_words), 4) if ref_words else 0.0
    intelligibility_rate = round(max(0.0, 1.0 - wer), 4)

    return {
        "word_error_rate": wer,
        "intelligibility_rate": intelligibility_rate,
        "reference_word_count": len(ref_words),
        "decoded_word_count": len(dec_words),
        "missed_words": missed_words,
        "extra_words": extra_words,
        "passed_clarity_gate": wer <= 0.15,  # <= 15% WER required for financial telephony
    }


def evaluate_interruption_timing(speech_onset_ms: float, playback_stopped_ms: float) -> dict:
    """Measure barge-in / interruption responsiveness: audio cutoff latency."""
    cutoff_latency_ms = round(playback_stopped_ms - speech_onset_ms, 2)
    # Telephony standard: audio must pause within 350ms of customer speaking
    passed = 0 <= cutoff_latency_ms <= 350.0

    return {
        "speech_onset_ms": speech_onset_ms,
        "playback_stopped_ms": playback_stopped_ms,
        "cutoff_latency_ms": cutoff_latency_ms,
        "max_allowable_latency_ms": 350.0,
        "passed_interruption_gate": passed,
    }
