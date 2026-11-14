"""Read-only measurement of supplied, content-addressed evaluation evidence."""
from __future__ import annotations

import math
import random
import statistics
import sys
import unicodedata
import wave
from array import array
from collections import defaultdict
from pathlib import Path

from training.common import file_hash, read_json


class EvidenceError(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise EvidenceError(reason)


def evidence_file(directory, entry):
    relative = Path(entry["path"])
    require(not relative.is_absolute(), "relative_evidence_path_required")
    source = (directory / relative).resolve()
    require(source.is_relative_to(directory.resolve()), "evidence_outside_bundle")
    require(source.is_file() and source.stat().st_size > 0, "missing_evidence_file")
    require(file_hash(source) == entry["sha256"], "evidence_hash_mismatch")
    return source


def word_errors(reference, hypothesis):
    previous = list(range(len(hypothesis) + 1))
    for index, word in enumerate(reference, 1):
        current = [index]
        for pos, other in enumerate(hypothesis, 1):
            current.append(min(previous[pos] + 1, current[-1] + 1, previous[pos - 1] + (word != other)))
        previous = current
    return previous[-1]


def tokens(text):
    # Keep Devanagari combining marks. Drop punctuation and normalize whitespace.
    normal = unicodedata.normalize("NFKC", text).casefold()
    return "".join(" " if unicodedata.category(char)[0] in {"P", "S"} else char for char in normal).split()


def percentile(values, fraction):
    return sorted(values)[math.ceil(len(values) * fraction) - 1] if values else None


def waveform(path):
    with wave.open(str(path), "rb") as wav:
        frames, rate = wav.getnframes(), wav.getframerate()
        require(wav.getnchannels() == 1 and wav.getsampwidth() == 2 and rate == 8000, "expected_mono_pcm16_8khz")
        require(0 < frames <= rate * 600, "invalid_clip_duration")
        samples = wav.readframes(frames)
        require(len(samples) == frames * 2, "truncated_audio")
        pcm = array("h")
        pcm.frombytes(samples)
        if sys.byteorder != "little":
            pcm.byteswap()
        require(max(pcm) - min(pcm) >= 32, "silent_or_constant_audio")
        return frames * 1000 / rate


def score_language(entries):
    asr = [e for e in entries if e["kind"] == "asr"]
    tts = [e for e in entries if e["kind"] == "tts"]
    result = {"asr_utterances": len(asr), "tts_clips": len(tts)}
    # Empty ASR hypotheses count as complete deletions.
    for name, normalize in [("normalized_wer", tokens), ("raw_wer", str.split)]:
        numerator = denominator = 0
        for clip in asr:
            reference = normalize(clip["reference"])
            require(reference, "empty_asr_reference")
            numerator += word_errors(reference, normalize(clip["decoded"]))
            denominator += len(reference)
        result[name] = numerator / denominator if denominator else None
    entities = [(v, clip["recognized_entities"].get(k)) for clip in asr for k, v in clip["expected_entities"].items()]
    entity_types = {key for clip in asr for key in clip["expected_entities"]}
    result["critical_entity_accuracy"] = sum(a == b and type(a) is type(b) for a, b in entities) / len(entities) if entities else None
    result["entity_types"] = sorted(entity_types)
    rated = [clip for clip in tts if len(clip["ratings"]) >= 3]
    ratings = [r for clip in rated for r in clip["ratings"]]
    result["rated_clips"] = len(rated)
    cluster_scores = [statistics.mean(r["naturalness"] for r in c["ratings"]) for c in rated]
    result["mos"] = statistics.mean(cluster_scores) if rated else None
    if len(cluster_scores) >= 2:
        rng = random.Random(42)
        boot = [statistics.mean(rng.choices(cluster_scores, k=len(cluster_scores))) for _ in range(1000)]
        result["mos_clip_bootstrap_95ci"] = [percentile(boot, .025), percentile(boot, .975)]
    result["pronunciation_approval"] = sum(all(r["pronunciation_ok"] for r in clip["ratings"]) for clip in rated) / len(rated) if rated else None
    result["intelligibility_failures"] = sum(not r["intelligible"] for r in ratings)
    money = [c for c in rated if c.get("financial_entities")]
    result["financial_clips"] = len(money)
    result["financial_errors"] = sum(not r["financial_correct"] for c in money for r in c["ratings"])
    return result


def check_ratings(clip):
    seen = set()
    for rating in clip["ratings"]:
        identity = rating["rater_id"]
        require(isinstance(identity, str) and identity.strip() and identity not in seen, "distinct_raters_required")
        seen.add(identity)
        require(rating["blinded"] is True and rating["qualified"] is True and rating["audio_sha256"] == clip["sha256"], "invalid_rating_provenance")
        require(type(rating["naturalness"]) is int and 1 <= rating["naturalness"] <= 5, "invalid_mos")
        for key in ["intelligible", "pronunciation_ok"] + (["financial_correct"] if clip.get("financial_entities") else []):
            require(type(rating[key]) is bool, "invalid_rating")


def interruption_metrics(turns):
    latencies, stops = defaultdict(list), []
    substantive = backchannels = false_stops = 0
    for clip, duration in turns:
        def position(key):
            value = clip[key]
            require(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= duration, "annotation_outside_audio")
            return value
        event = clip["event"]
        if event in {"common", "fallback"}:
            latency = position("first_meaningful_audio_ms") - position("end_of_speech_ms")
            require(latency >= 0, "negative_response_latency")
            latencies[event].append(latency)
        elif event in {"barge_in", "backchannel"}:
            onset = position("speech_onset_ms")
            stopped = clip.get("playback_stopped_ms") is not None
            delay = position("playback_stopped_ms") - onset if stopped else None
            require(delay is None or delay >= 0, "negative_stop_delay")
            if event == "barge_in":
                substantive += 1
                if stopped:
                    stops.append(delay)
            else:
                backchannels += 1
                false_stops += stopped
        else:
            raise EvidenceError("unknown_turn_event")
    result = {"common_p50_ms": percentile(latencies["common"], .5), "common_p95_ms": percentile(latencies["common"], .95),
              "fallback_p95_ms": percentile(latencies["fallback"], .95), "stop_p95_ms": percentile(stops, .95),
              "interruption_success": len(stops) / substantive if substantive else None,
              "false_interruption_rate": false_stops / backchannels if backchannels else None}
    limits = [1200, 2000, 3000, 300]
    result["passed"] = all(result[k] is not None and result[k] <= limit for k, limit in zip(("common_p50_ms", "common_p95_ms", "fallback_p95_ms", "stop_p95_ms"), limits)) and substantive > 0 and len(stops) / substantive >= .95 and backchannels > 0 and false_stops / backchannels <= .05
    return result


def assess_recordings(manifest):
    manifest = Path(manifest).resolve()
    result = {"status": "blocked", "acoustic_quality_measured": False, "voice_qualified": False, "interruption_timing_passed": False}
    try:
        if not manifest.is_file():
            raise EvidenceError("recording_manifest_missing")
        bundle = read_json(manifest)
        require(bundle["schema"] == 1 and bundle["capture"] in {"provider_sample", "locked_phone"}, "unsupported_capture_mode")
        locked = bundle["capture"] == "locked_phone"
        if locked:
            require(bundle["capture_point"] in {"far_end_handset", "calibrated_loopback"} and bundle["codec"] in {"PCMU", "PCMA"}, "phone_audio_provenance_required")
            require(bundle["independent_holdout"] is True and bundle["consented"] is True, "holdout_and_consent_required")
        languages = {"en-IN": [], "hi-en": []}
        turns = {"en-IN": [], "hi-en": []}
        speakers, ids, hashes = set(), set(), set()
        for clip in bundle["clips"]:
            require(clip["id"] and clip["id"] not in ids and clip["sha256"] not in hashes, "duplicate_clip")
            ids.add(clip["id"])
            hashes.add(clip["sha256"])
            duration = waveform(evidence_file(manifest.parent, clip))
            require(clip["language"] in languages and clip["kind"] in {"tts", "asr", "turn"}, "unknown_clip_type")
            if clip["kind"] == "turn":
                turns[clip["language"]].append((clip, duration))
            else:
                require(isinstance(clip["reference"], str) and tokens(clip["reference"]), "reference_required")
                if clip["kind"] == "asr":
                    require(isinstance(clip["decoded"], str) and clip["speaker_id"] and isinstance(clip["expected_entities"], dict) and isinstance(clip["recognized_entities"], dict), "missing_asr_measurement")
                    speakers.add(clip["speaker_id"])
                else:
                    check_ratings(clip)
                languages[clip["language"]].append(clip)
        require(ids, "empty_audio_set")
        scores = {lang: score_language(clips) for lang, clips in languages.items()}
        timings = {lang: interruption_metrics(items) for lang, items in turns.items()}
        result.update(manifest_sha256=file_hash(manifest), capture=bundle["capture"], verified_audio_files=len(ids),
                      scores=scores, speakers=len(speakers), turn_timing=timings,
                      acoustic_quality_measured=any(row["rated_clips"] for row in scores.values()),
                      interruption_timing_passed=locked and all(t["passed"] for t in timings.values()))
        required_entities = {"amount", "currency", "date", "invoice_id", "negation", "payment_state"}
        result["voice_qualified"] = locked and len(speakers) >= 60 and all(
            r["asr_utterances"] >= 600 and r["tts_clips"] >= 150 and r["rated_clips"] == r["tts_clips"]
            and r["normalized_wer"] <= (.12 if lang == "en-IN" else .18)
            and required_entities.issubset(r["entity_types"]) and r["critical_entity_accuracy"] >= .98
            and r["mos"] >= 4 and r["pronunciation_approval"] >= .95
            and r["financial_clips"] > 0 and r["financial_errors"] == 0 for lang, r in scores.items())
        result["status"] = "passed" if result["voice_qualified"] else "incomplete"
    except (KeyError, TypeError, ValueError, OSError, EOFError, wave.Error) as exc:
        result["blocker"] = str(exc) if isinstance(exc, EvidenceError) else type(exc).__name__
    return result
