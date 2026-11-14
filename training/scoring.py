"""Deterministic response-plan scoring. These metrics do not measure natural speech."""
import json
import math
from collections import Counter
from typing import Any
from training.common import canonical_json, validate_response


def score_prediction(raw: str, target: dict[str, Any], *, facts: dict[str, Any], allowed: list[str]) -> dict[str, Any]:
    def reject_nonfinite(value):
        raise ValueError("nonfinite_prediction")

    try:
        plan = json.loads(raw, parse_constant=reject_nonfinite)
        canonical_json(plan)
    except (RecursionError, ValueError, TypeError):
        plan = None
    errors = validate_response(plan, language=target["language"], allowed=allowed, facts=facts)
    if isinstance(plan, dict) and plan.get("turn_id") != target["turn_id"]:
        errors.append("turn_id_mismatch")
    p = plan if isinstance(plan, dict) else {}
    return {"prediction": plan, "schema_valid": not errors, "errors": errors,
            "intent_correct": p.get("intent") == target["intent"],
            "action_correct": p.get("proposed_action") == target["proposed_action"],
            "slots_exact": canonical_json(p.get("candidate_slots")) == canonical_json(target["candidate_slots"]),
            "facts_exact": isinstance(p.get("required_fact_refs"), list)
                          and all(isinstance(ref, str) for ref in p["required_fact_refs"])
                          and set(p["required_fact_refs"]) == set(target["required_fact_refs"]),
            "tool_exact": "tool_request" in p and canonical_json(p["tool_request"]) == canonical_json(target["tool_request"]),
            "clarification_correct": p.get("needs_clarification") is target["needs_clarification"],
            "action_allowed": p.get("proposed_action") in allowed,
            "target_intent": target["intent"], "predicted_intent": p.get("intent") if isinstance(p.get("intent"), str) else "invalid"}


def summarize(scores: list[dict[str, Any]]) -> dict[str, Any]:
    if not scores:
        raise ValueError("cannot_score_zero_predictions")
    count = len(scores)
    metrics = {key + "_rate": sum(bool(s[key]) for s in scores) / count for key in
               ("schema_valid", "intent_correct", "action_correct", "slots_exact", "facts_exact", "tool_exact", "clarification_correct", "action_allowed")}
    labels = sorted({s["target_intent"] for s in scores} | {s["predicted_intent"] for s in scores})
    f1s = []
    for label in labels:
        tp = sum(s["target_intent"] == label and s["predicted_intent"] == label for s in scores)
        fp = sum(s["target_intent"] != label and s["predicted_intent"] == label for s in scores)
        fn = sum(s["target_intent"] == label and s["predicted_intent"] != label for s in scores)
        f1s.append(2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else 0)
    timings = sorted(s["latency_ms"] for s in scores)
    return {"examples": count, **metrics, "intent_macro_f1": sum(f1s) / len(f1s),
            "latency_p50_ms": timings[max(0, math.ceil(count * .5) - 1)],
            "latency_p95_ms": timings[max(0, math.ceil(count * .95) - 1)],
            "schema_error_counts": dict(Counter(e for s in scores for e in s["errors"]))}
