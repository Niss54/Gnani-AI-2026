"""Master verification and evidence generator for RevClaim AI Voice Agent.

Generates:
- artifacts/verification/voice-contract.json
- artifacts/evaluation/voice-offline.json
- artifacts/verification/release.json
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import atomic_json, file_hash, read_json, resolve_path, utc_now


def run_voice_contract_verification() -> dict:
    cmd = [sys.executable, "-m", "pytest", "tests/voice/", "-v"]

    proc = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, timeout=180)
    passed = proc.returncode == 0

    report = {
        "report_type": "voice_contract_verification",
        "status": "passed" if passed else "failed",
        "timestamp": utc_now(),
        "exit_code": proc.returncode,
        "test_suite": "tests/voice/",
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }
    atomic_json(ROOT_DIR / "artifacts" / "verification" / "voice-contract.json", report)
    return report


def run_voice_offline_evaluation() -> dict:
    # Verifies offline deterministic pronunciation, money rendering, and unicode stripping
    from backend.services.speech_normalizer import parse_explicit_amount, render_for_speech, spoken_money

    test_cases = [
        ("INR English 45000", spoken_money(4500000, "INR", "en-IN"), "45,000 rupees"),
        ("INR Hinglish 45000", spoken_money(4500000, "INR", "hi-en"), "45,000 rupaye"),
        ("USD English 250", spoken_money(25000, "USD", "en-IN"), "250 US dollars"),
        ("Explicit amount 1.5 lakh", parse_explicit_amount("1.5 lakh"), 15000000),
        ("Sanitize XML", render_for_speech("<Say>clean</Say>"), "clean"),
    ]

    all_passed = all(actual == expected for _, actual, expected in test_cases)
    report = {
        "report_type": "voice_offline_evaluation",
        "status": "passed" if all_passed else "failed",
        "timestamp": utc_now(),
        "mode": "text_normalization_only",
        "acoustic_quality_measured": False,
        "voice_qualified": False,
        "cases_evaluated": len(test_cases),
        "results": [{"name": name, "passed": actual == expected, "actual": actual} for name, actual, expected in test_cases],
        "speech_normalization_invariant": "Zero numeric drift between semantic minor units and spoken words.",
    }
    atomic_json(ROOT_DIR / "artifacts" / "evaluation" / "voice-offline.json", report)
    return report


def run_release_verification() -> dict:
    blockers = {
        "A01": "Authoritative production ledger integration remains incomplete",
        "A02": "Browser and carrier parity requires integration verification",
        "A03": "Provider-backed delivery and handoff adapters missing",
        "A04": "Local regression tests do not qualify the complete dialogue corpus",
        "A05": "Recorded bilingual acoustic evaluation and human listening scores missing",
        "A06": "Live interruption timing and accepted human transfer unmeasured",
        "A07": "Bilingual human review and semantic distinctness receipts missing",
        "A08": "No verified trained adapter weights",
        "A09": "Candidate inference and held-out comparative evaluation missing",
        "A10": "Production deployment and recovery drills unverified",
        "A11": "Staging and pilot recordings missing",
        "A12": "Product-wide claim reconciliation incomplete",
    }
    report = {
        "report_type": "release_verification", "status": "blocked", "timestamp": utc_now(),
        "matrix": {key: {"status": "blocked", "blocker": reason} for key, reason in blockers.items()},
        "ready_for_production_traffic": False,
        "summary": "Local code checks cannot stand in for model, acoustic, provider or pilot qualification.",
    }
    atomic_json(ROOT_DIR / "artifacts/verification/release.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run voice verification suites.")
    parser.add_argument("--mode", choices=["contract", "voice-offline", "release"], required=True, help="Verification mode")
    args = parser.parse_args()

    if args.mode == "contract":
        res = run_voice_contract_verification()
    elif args.mode == "voice-offline":
        res = run_voice_offline_evaluation()
    elif args.mode == "release":
        res = run_release_verification()

    print(json.dumps(res, indent=2))
    return 0 if res.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
