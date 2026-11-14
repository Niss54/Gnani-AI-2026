import math
import struct
import wave

import pytest

from scripts.verify_controlled_pilot import verify_pilot
from scripts.verify_voice import run_voice_offline_evaluation, check_review
from scripts.voice_evidence import EvidenceError, assess_recordings, interruption_metrics, tokens, word_errors
from training.common import atomic_json, file_hash


def wav(tmp_path, language):
    file = tmp_path / (language + ".wav")
    frequency = 250 if language == "hi-en" else 400
    with wave.open(str(file), "wb") as writer:
        writer.setparams((1, 2, 8000, 0, "NONE", ""))
        writer.writeframes(b"".join(struct.pack("<h", int(4000 * math.sin(2 * math.pi * frequency * t / 8000))) for t in range(8000)))
    return {"id": language, "language": language, "kind": "tts", "path": file.name,
            "sha256": file_hash(file), "reference": "Synthetic test fixture.", "ratings": []}


def save(tmp_path, name, data):
    file = tmp_path / name
    atomic_json(file, data)
    return {"path": file.name, "sha256": file_hash(file)}


def test_missing_audio_does_not_pass_with_text_checks(tmp_path):
    result = run_voice_offline_evaluation(tmp_path / "missing", tmp_path / "result.json")
    assert result["normalization_passed"] and result["status"] == "blocked"
    assert not result["voice_qualified"] and not result["acoustic_quality_measured"]


def test_real_wave_files_report_only_measurements_supplied(tmp_path):
    clips = [wav(tmp_path, lang) for lang in ("hi-en", "en-IN")]
    save(tmp_path, "bundle.json", {"schema": 1, "capture": "provider_sample", "clips": clips})
    result = assess_recordings(tmp_path / "bundle.json")
    assert result["status"] == "incomplete" and result["verified_audio_files"] == 2
    assert result["scores"]["hi-en"]["mos"] is None and not result["voice_qualified"]
    (tmp_path / "hi-en.wav").write_bytes(b"changed")
    assert assess_recordings(tmp_path / "bundle.json")["blocker"] == "evidence_hash_mismatch"


def test_rater_must_listen_to_exact_clip_and_be_distinct(tmp_path):
    clip = wav(tmp_path, "hi-en")
    rating = {"rater_id": "r1", "audio_sha256": clip["sha256"], "blinded": True, "qualified": True,
              "naturalness": 5, "intelligible": True, "pronunciation_ok": True}
    clip["ratings"] = [rating] * 3
    save(tmp_path, "bundle.json", {"schema": 1, "capture": "provider_sample", "clips": [clip]})
    assert assess_recordings(tmp_path / "bundle.json")["blocker"] == "distinct_raters_required"


def test_wer_counts_word_order_and_hindi_vowels():
    assert word_errors(tokens("No, not today."), tokens("no today")) == 1
    assert tokens("नहीं अभी।") == ["नहीं", "अभी"]


def test_timing_needs_audio_bounded_far_end_annotations():
    turns = [({"event": "common", "end_of_speech_ms": 40, "first_meaningful_audio_ms": 140}, 500),
             ({"event": "fallback", "end_of_speech_ms": 50, "first_meaningful_audio_ms": 170}, 500),
             ({"event": "barge_in", "speech_onset_ms": 5, "playback_stopped_ms": 250}, 500),
             ({"event": "backchannel", "speech_onset_ms": 5, "playback_stopped_ms": None}, 500)]
    assert interruption_metrics(turns)["passed"]
    assert not interruption_metrics(turns[:-1])["passed"]
    with pytest.raises(EvidenceError):
        interruption_metrics([({"event": "barge_in", "speech_onset_ms": 0, "playback_stopped_ms": 999}, 500)])


def pilot_bundle(tmp_path):
    sid = "CA" + "a" * 32
    cdr = {"sid": sid, "to": "fixture-test-target", "start_time": "2026-11-10T10:00:00Z", "duration": "45", "status": "completed"}
    consent = {"destination": cdr["to"], "scope": "staging", "granted": True, "suppressed": False,
               "authorized_at": "2026-11-10T09:00:00Z", "expires_at": "2026-11-10T11:00:00Z"}
    outcome = {"call_sid": sid, "language": "hi-en", "deployment_id": "test", "reviewer_id": "fixture",
               "critical_incidents": 0, "independent_script_id": "test-script"}
    session = {"stage": "staging", "language": "hi-en", "carrier": save(tmp_path, "carrier.json", cdr),
               "authorization": save(tmp_path, "authorization.json", consent), "outcome": save(tmp_path, "outcome.json", outcome)}
    review = {"deployment_id": "test", "reviewer_id": "fixture", "unresolved_critical_issues": 0, "call_sids": [sid]}
    return {"schema": 1, "deployment_id": "test", "review": save(tmp_path, "review.json", review), "calls": [session]}


def test_pilot_cannot_equate_completed_or_duplicate_call_to_accepted_handoff(tmp_path):
    bundle = pilot_bundle(tmp_path)
    save(tmp_path, "pilot.json", bundle)
    report = verify_pilot(tmp_path / "pilot.json")
    assert report["status"] == "incomplete" and not report["human_handoff_verified"]
    assert report["staging_calls"] == {"hi-en": 1}
    bundle["calls"].append(bundle["calls"][0])
    save(tmp_path, "pilot.json", bundle)
    assert verify_pilot(tmp_path / "pilot.json")["blocker"] == "duplicate_or_invalid_carrier_call"


def test_release_review_cannot_count_stale_source_or_bad_hash(tmp_path):
    evidence = save(tmp_path, "audit.txt", {"test_fixture": "signed off"})
    bundle = {"runtime_sha256": "source", "gates": {"A12": {"reviewer_id": "operator", "decision": "passed",
              "evidence": {"ui_claim_audit": evidence, "documentation_claim_audit": evidence}}}}
    save(tmp_path, "release.json", bundle)
    with pytest.raises(EvidenceError, match="runtime_changed_since_review"):
        check_review(tmp_path / "release.json", "A12", "new-source")
    (tmp_path / "audit.txt").write_bytes(b"changed")
    with pytest.raises(EvidenceError, match="evidence_hash_mismatch"):
        check_review(tmp_path / "release.json", "A12", "source")
