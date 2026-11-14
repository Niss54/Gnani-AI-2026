"""Audit exported call and consent evidence. This verifier performs no network I/O."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.voice_evidence import EvidenceError, evidence_file, require
from training.common import atomic_json, file_hash, read_json, resolve_path, utc_now


def timestamp(value):
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        parsed = parsedate_to_datetime(value)
    require(parsed.utcoffset() is not None, "timezone_required")
    return parsed


def verify_pilot(manifest_path):
    manifest = resolve_path(manifest_path)
    result = {"status": "blocked", "scope": "operator_supplied_carrier_and_review_exports",
              "human_handoff_verified": False, "staging_passed": False, "pilot_passed": False}
    try:
        if not manifest.is_file():
            raise EvidenceError("pilot_evidence_manifest_missing")
        bundle = read_json(manifest)
        require(bundle["schema"] == 1 and bundle["deployment_id"], "pilot_deployment_required")
        review = read_json(evidence_file(manifest.parent, bundle["review"]))
        require(review["deployment_id"] == bundle["deployment_id"] and review["reviewer_id"] and
                type(review["unresolved_critical_issues"]) is int and review["unresolved_critical_issues"] >= 0,
                "invalid_pilot_review")
        seen_calls, seen_scripts = set(), set()
        calls, scripts = Counter(), Counter()
        accepted = False
        for session in bundle["calls"]:
            lang, stage = session["language"], session["stage"]
            require(lang in {"en-IN", "hi-en"} and stage in {"staging", "pilot"}, "unknown_call_group")
            cdr = read_json(evidence_file(manifest.parent, session["carrier"]))
            consent = read_json(evidence_file(manifest.parent, session["authorization"]))
            audit = read_json(evidence_file(manifest.parent, session["outcome"]))
            # Twilio completed + duration establishes connection, not human acceptance.
            call_id = cdr["sid"]
            require(isinstance(call_id, str) and call_id.startswith("CA") and len(call_id) == 34
                    and all(c in "0123456789abcdefABCDEF" for c in call_id[2:]) and call_id not in seen_calls,
                    "duplicate_or_invalid_carrier_call")
            seen_calls.add(call_id)
            require(cdr["status"] == "completed" and int(cdr["duration"]) > 0 and cdr["to"], "connected_carrier_call_required")
            start = timestamp(cdr["start_time"])
            require(consent["destination"] == cdr["to"] and consent["scope"] == stage and consent["granted"] is True and
                    consent["suppressed"] is False and timestamp(consent["authorized_at"]) <= start <= timestamp(consent["expires_at"]),
                    "prior_scoped_call_consent_required")
            require(audit["call_sid"] == call_id and audit["language"] == lang and audit["deployment_id"] == bundle["deployment_id"] and
                    audit["reviewer_id"] and type(audit["critical_incidents"]) is int and audit["critical_incidents"] == 0,
                    "call_outcome_review_missing_or_failed")
            if stage == "staging":
                script = audit["independent_script_id"]
                require(script and (lang, script) not in seen_scripts, "duplicate_staging_script")
                seen_scripts.add((lang, script))
                scripts[lang] += 1
            else:
                calls[lang] += 1
            if audit.get("handoff_reported") == "human_accepted":
                require("handoff" in session, "claimed_handoff_missing_acceptance_receipt")
            if "handoff" in session:
                handoff = read_json(evidence_file(manifest.parent, session["handoff"]))
                require(handoff["parent_call_sid"] == call_id and handoff["destination_answered"] is True and
                        handoff["human_accepted"] is True and handoff["accepting_agent_id"], "handoff_acceptance_unverified")
                accepted = True
        require(seen_calls == set(review["call_sids"]), "batch_review_call_set_mismatch")
        clean = review["unresolved_critical_issues"] == 0
        result.update(manifest_sha256=file_hash(manifest), deployment_id=bundle["deployment_id"], human_handoff_verified=accepted,
                      staging_calls=dict(scripts), pilot_calls=dict(calls), staging_passed=clean and min(scripts["hi-en"], scripts["en-IN"]) >= 100,
                      pilot_passed=clean and min(calls["hi-en"], calls["en-IN"]) >= 50)
        result["status"] = "passed" if result["staging_passed"] and result["pilot_passed"] and accepted else "incomplete"
    except (OSError, ValueError, KeyError, TypeError, OverflowError) as exc:
        result["blocker"] = str(exc) if isinstance(exc, EvidenceError) else type(exc).__name__
    return result


def run_controlled_pilot_verification(output_path="artifacts/verification/controlled-pilot.json",
                                      manifest_path="artifacts/pilot/evidence.json"):
    result = verify_pilot(manifest_path)
    result.update(report_type="controlled_pilot_verification", timestamp=utc_now())
    atomic_json(output_path, result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="artifacts/pilot/evidence.json")
    parser.add_argument("--output", default="artifacts/verification/controlled-pilot.json")
    args = parser.parse_args()
    report = run_controlled_pilot_verification(args.output, args.manifest)
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["status"] == "passed" else 1)
