"""Tests for voice speech normalizer and monetary rendering."""

import pytest
from backend.contracts.voice import VoiceError
from backend.services.speech_normalizer import (
    normalize_transcript,
    parse_explicit_amount,
    render_for_speech,
    spoken_money,
)


def test_spoken_money_inr_english():
    assert spoken_money(4500000, "INR", "en-IN") == "45,000 rupees"
    assert spoken_money(5050, "INR", "en-IN") == "50 rupees 50 paise"


def test_spoken_money_inr_hinglish():
    assert spoken_money(4500000, "INR", "hi-en") == "45,000 rupaye"
    assert spoken_money(1200, "INR", "hi-en") == "12 rupaye"


def test_spoken_money_usd():
    assert spoken_money(25000, "USD", "en-IN") == "250 US dollars"
    assert spoken_money(25075, "USD", "en-IN") == "250 US dollars 75 cents"


def test_spoken_money_unsupported_currency():
    with pytest.raises(VoiceError) as exc:
        spoken_money(1000, "EUR", "en-IN")
    assert exc.value.code == "unsupported_currency"


def test_parse_explicit_amount():
    # Explicit single numbers
    assert parse_explicit_amount("I will pay 45000 tomorrow") == 4500000
    assert parse_explicit_amount("kal main 5000 de dunga") == 500000
    assert parse_explicit_amount("I can pay 10k by Friday") == 1000000
    assert parse_explicit_amount("paying 1.5 lakh") == 15000000

    # Ambiguous or multiple numbers should return None to ask clarification
    assert parse_explicit_amount("maybe 2000 or 5000") is None
    assert parse_explicit_amount("no amount mentioned") is None


def test_render_for_speech():
    cleaned = render_for_speech("Hello <Say>test</Say> world \x00\x05 clean")
    assert cleaned == "Hello test world clean"
