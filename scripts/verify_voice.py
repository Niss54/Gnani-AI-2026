"""Verify local contracts, input-bound audio measurements and PRD release evidence."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.verify_controlled_pilot import verify_pilot
from scripts.voice_evidence import EvidenceError, assess_recordings, evidence_file, require
from training.common import atomic_json, digest, file_hash, read_json, resolve_path, utc_now

RECORDINGS = "artifacts/evaluation/recordings.json"
PILOT = "artifacts/pilot/evidence.json"
RELEASE_REVIEW = "artifacts/verification/release-review.json"


def runtime_fingerprint():
    files = {}
    for root, suffixes in (("backend", {".py"}), ("frontend/app", {".ts", ".tsx"}), ("frontend/lib", {".ts"}),
                           ("training", {".py", ".sh"}), ("scripts", {".py", ".js", ".cjs"}),
                           ("tests", {".py", ".mjs", ".cjs"})):
        for path in (ROOT_DIR / root).rglob("*"):
            if path.suffix in suffixes and path.is_file():
                files[path.relative_to(ROOT_DIR).as_posix()] = file_hash(path)
    for name in ("package-lock.json", "backend/requirements.txt", "training/configs/revclaim-sft.json", "training/requirements.txt"):
        files[name] = file_hash(ROOT_DIR / name)
    return digest(files)


def run_voice_contract_verification():
    cmd = [sys.executable, "-m", "pytest", "tests/voice", "-q"]
    run = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, timeout=300)
    report = {"report_type": "voice_contract_verification", "status": "passed" if run.returncode == 0 else "failed",
              "timestamp": utc_now(), "exit_code": run.returncode, "command": cmd,
              "runtime_sha256": runtime_fingerprint(), "stdout": run.stdout, "stderr": run.stderr}
    atomic_json("artifacts/verification/voice-contract.json", report)
    return report


def run_voice_offline_evaluation(recordings=RECORDINGS, output="artifacts/evaluation/voice-offline.json"):
    from backend.services.speech_normalizer import apply_phonetic_normalization, parse_explicit_amount, render_for_speech, spoken_money

    cases = [
        ("amount_en", spoken_money(4500000, "INR", "en-IN"), "45,000 rupees"),
        ("amount_hi_en", spoken_money(4500000, "INR", "hi-en"), "45,000 rupaye"),
        ("currency_usd", spoken_money(25000, "USD", "en-IN"), "250 US dollars"),
        ("lakh", parse_explicit_amount("1.5 lakh"), 15000000),
        ("markup", render_for_speech("<Say>clean</Say>"), "clean"),
        ("acronym_hi_en", apply_phonetic_normalization("Pay ₹45,000 via UPI.", "hi-en"), "Pay 45,000 rupaye via U-P-I."),
    ]
    text_checks = {name: actual == expected for name, actual, expected in cases}
    report = assess_recordings(resolve_path(recordings))
    report.update(report_type="voice_offline_evaluation", timestamp=utc_now(), text_checks=text_checks,
                  normalization_passed=all(text_checks.values()))
    if not report["normalization_passed"]:
        report.update(status="failed", voice_qualified=False)
    atomic_json(output, report)
    return report


# Section 19 lists the evidence required for manual or operational gates.
REVIEW_ARTIFACTS = {
    "A01": {"tenant_isolation", "authoritative_state", "restart"},
    "A02": {"browser_phone_parity", "python_phone_entrypoint"},
    "A03": {"outbox_idempotency", "create_without_send", "settlement_reconciliation", "provider_receipts"},
    "A04": {"bilingual_golden", "durable_critical_actions"},
    "A06": {"cancellation_stale_actions"},
    "A09": {"locked_baseline_comparison", "hybrid_fallback", "noninferiority", "critical_cases"},
    "A10": {"dependency_lock", "launch_readiness", "load_and_recovery", "rollback"},
    "A12": {"ui_claim_audit", "documentation_claim_audit"},
}


def check_review(bundle_path, gate, fingerprint):
    if not bundle_path.is_file():
        raise EvidenceError("criterion_review_missing")
    bundle = read_json(bundle_path)
    require(bundle["runtime_sha256"] == fingerprint, "runtime_changed_since_review")
    record = bundle["gates"].get(gate)
    require(record and record["reviewer_id"] and record["decision"] == "passed", "criterion_review_incomplete")
    files = record["evidence"]
    for role in REVIEW_ARTIFACTS[gate]:
        require(role in files, "required_evidence_missing:" + role)
        evidence_file(bundle_path.parent, files[role])
    return file_hash(bundle_path)


def run_release_verification(recordings=RECORDINGS, pilot=PILOT, review=RELEASE_REVIEW,
                             output="artifacts/verification/release.json"):
    from training.artifacts import verify_artifacts, verify_freeze
    from training.data_pipeline import validate_dataset
    from training.common import PipelineError

    fingerprint = runtime_fingerprint()
    config = read_json("training/configs/revclaim-sft.json")
    run = resolve_path(config["output_dir"]) / "full"
    recording = assess_recordings(resolve_path(recordings))
    pilot_result = verify_pilot(pilot)
    matrix = {}
    for index in range(1, 13):
        gate = f"A{index:02d}"
        evidence = {}
        try:
            if gate in {"A01", "A02", "A03", "A04", "A06"}:
                contract = read_json("artifacts/verification/voice-contract.json")
                require(contract.get("runtime_sha256") == fingerprint and contract.get("exit_code") == 0 and contract.get("status") == "passed", "current_contract_run_required")
                evidence["contract_sha256"] = file_hash("artifacts/verification/voice-contract.json")
            if gate == "A05":
                require(recording["voice_qualified"], recording.get("blocker", "locked_acoustic_gates_incomplete"))
                evidence["recordings_sha256"] = recording["manifest_sha256"]
            if gate == "A06":
                require(recording["interruption_timing_passed"] and pilot_result["human_handoff_verified"], "far_end_timing_and_human_acceptance_required")
                evidence.update(recordings_sha256=recording["manifest_sha256"], pilot_sha256=pilot_result["manifest_sha256"])
            if gate == "A07":
                checked = validate_dataset(config["dataset_manifest"], require_human=True, require_complete=True)
                require(checked.get("production_ready") is True, "complete_reviewed_leakage_checked_corpus_required")
                evidence["manifest_sha256"] = checked["manifest_hash"]
            if gate in {"A08", "A09"}:
                trained, inventory = verify_artifacts(run)
                require(read_json(run / "run_receipt.json")["mode"] == "full", "full_training_run_required")
                require(trained == config, "current_candidate_config_required")
                reload_receipt = read_json(run / "reload_receipt.json")
                require(reload_receipt.get("status") == "passed" and reload_receipt.get("artifact_digest") == digest(inventory), "clean_reload_required")
                evidence["training_digest"] = digest(inventory)
                if gate == "A09":
                    manifest_hash = file_hash(config["dataset_manifest"])
                    verify_freeze(run, inventory, manifest_hash)
                    report = read_json("artifacts/evaluation/locked-test.json")
                    require(report["status"] == "passed" and report["split"] == "locked-test" and
                            report["manifest_hash"] == manifest_hash and report["artifact_digest"] == digest(inventory)
                            and {"candidate", "base"}.issubset(report["models_evaluated"])
                            and report["predictions_sha256"] == file_hash(report["predictions_path"]), "locked_comparison_required")
                    evidence["predictions_sha256"] = report["predictions_sha256"]
            if gate == "A11":
                require(pilot_result["status"] == "passed", pilot_result.get("blocker", "staging_and_pilot_incomplete"))
                evidence["pilot_sha256"] = pilot_result["manifest_sha256"]
            if gate in REVIEW_ARTIFACTS:
                evidence["criterion_review_sha256"] = check_review(resolve_path(review), gate, fingerprint)
            matrix[gate] = {"status": "passed", "evidence": evidence}
        except (OSError, ValueError, TypeError, KeyError) as exc:
            matrix[gate] = {"status": "blocked", "blocker": str(exc) if isinstance(exc, (PipelineError, EvidenceError)) else type(exc).__name__}
    passed = sum(item["status"] == "passed" for item in matrix.values())
    result = {"report_type": "release_verification", "timestamp": utc_now(), "runtime_sha256": fingerprint,
              "status": "passed" if passed == len(matrix) else "blocked", "ready_for_production_traffic": passed == len(matrix),
              "passed_gates": passed, "total_gates": len(matrix), "matrix": matrix}
    atomic_json(output, result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["contract", "voice-offline", "release"], required=True)
    parser.add_argument("--recordings", default=RECORDINGS)
    parser.add_argument("--pilot", default=PILOT)
    parser.add_argument("--review", default=RELEASE_REVIEW)
    args = parser.parse_args()
    if args.mode == "contract":
        report = run_voice_contract_verification()
    elif args.mode == "voice-offline":
        report = run_voice_offline_evaluation(args.recordings)
    else:
        report = run_release_verification(args.recordings, args.pilot, args.review)
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["status"] == "passed" else 1)
