"""Shared data contracts. Importing this module never loads ML libraries."""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ("en", "hi-en")
SPLITS = ("train", "development", "locked-test")
APPROVED_LICENSES = {"project_authorized", "CC-BY-4.0", "Apache-2.0"}
RESPONSE_FIELDS = {
    "turn_id", "intent", "language", "proposed_action", "required_fact_refs",
    "candidate_slots", "reply_template_id", "free_reply", "tool_request",
    "needs_clarification",
}


class PipelineError(ValueError):
    """An actionable contract error, safe to show without input text."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_path(value: str | Path, base: Path = ROOT) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (base / path).resolve()


def read_json(path: str | Path) -> Any:
    with resolve_path(path).open(encoding="utf-8-sig") as stream:
        return json.load(stream)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def file_hash(path: str | Path) -> str:
    result = hashlib.sha256()
    with resolve_path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def content_hash(record: dict[str, Any]) -> str:
    # Approval metadata is not part of the content it attests to.
    return digest({key: value for key, value in record.items() if key not in {"review", "content_hash"}})


def atomic_json(path: str | Path, value: Any) -> None:
    target = resolve_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=".pending-", dir=target.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
        os.replace(temporary, target)
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink()


def read_jsonl(path: str | Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with resolve_path(path).open(encoding="utf-8-sig") as stream:
        for number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise PipelineError(f"invalid_jsonl_line:{number}") from exc
            if not isinstance(row, dict):
                raise PipelineError(f"jsonl_object_required:{number}")
            rows.append(row)
    return rows


def write_jsonl(path: str | Path, records: list[dict[str, Any]]) -> None:
    target = resolve_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=".pending-", dir=target.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            for record in records:
                stream.write(canonical_json(record) + "\n")
        os.replace(temporary, target)
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink()


def source_revision() -> dict[str, Any]:
    try:
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, check=True, timeout=10)
        diff = subprocess.run(["git", "diff", "--binary", "HEAD"], cwd=ROOT, capture_output=True, check=True, timeout=10)
        files = {str(path.relative_to(ROOT)): file_hash(path) for path in sorted((ROOT / "training").rglob("*.py")) if "__pycache__" not in path.parts}
        return {"revision": head.stdout.decode().strip(), "dirty_diff_hash": hashlib.sha256(diff.stdout).hexdigest(), "training_sources_hash": digest(files)}
    except (OSError, subprocess.SubprocessError):
        return {"revision": None, "dirty_diff_hash": None}


def report(name: str, status: str, **values: Any) -> dict[str, Any]:
    return {"report_type": name, "status": status, "timestamp": utc_now(), "command": [sys.executable, *sys.argv], "source": source_revision(), **values}


def cli_result(result: dict[str, Any], output: str | Path | None = None) -> int:
    code = 0 if result["status"] == "passed" else 2
    result["exit_code"] = code
    if output:
        atomic_json(output, result)
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    return code


def validate_response(plan: Any, *, language: str | None = None, allowed: list[str] | None = None, facts: dict[str, Any] | None = None) -> list[str]:
    errors: list[str] = []
    if not isinstance(plan, dict):
        return ["response_not_object"]
    if set(plan) != RESPONSE_FIELDS:
        errors.append("response_fields_mismatch")
    for field in ("turn_id", "intent", "proposed_action"):
        if not isinstance(plan.get(field), str) or not plan[field]:
            errors.append(f"invalid_{field}")
    if plan.get("language") not in LANGUAGES or (language and plan.get("language") != language):
        errors.append("invalid_response_language")
    if allowed is not None and plan.get("proposed_action") not in allowed:
        errors.append("action_outside_allowlist")
    refs = plan.get("required_fact_refs")
    if not isinstance(refs, list) or not all(isinstance(item, str) for item in refs):
        errors.append("invalid_fact_refs")
    elif facts is not None and any(ref not in facts for ref in refs):
        errors.append("unknown_fact_reference")
    if not isinstance(plan.get("candidate_slots"), dict):
        errors.append("invalid_candidate_slots")
    template, reply = plan.get("reply_template_id"), plan.get("free_reply")
    if (isinstance(template, str) and bool(template)) == (isinstance(reply, str) and bool(reply)):
        errors.append("exactly_one_template_or_reply_required")
    if plan.get("tool_request") is not None and not isinstance(plan.get("tool_request"), dict):
        errors.append("invalid_tool_request")
    if not isinstance(plan.get("needs_clarification"), bool):
        errors.append("invalid_clarification_flag")
    return errors


REVIEW_ATTESTATION = "I personally reviewed every submitted decision"


def review_valid(record: dict[str, Any]) -> bool:
    review = record.get("review", {})
    if review.get("status") != "human_approved":
        return False
    receipts = review.get("receipts", [])
    if not isinstance(receipts, list) or not receipts:
        return False
    for receipt in receipts:
        if not isinstance(receipt, dict) or receipt.get("actor_type") != "human" or not receipt.get("reviewer_id"):
            return False
        if (receipt.get("attestation") != REVIEW_ATTESTATION or
                receipt.get("source") != "reviewer_decision_import" or
                not re.fullmatch(r"[a-f0-9]{64}", str(receipt.get("decision_file_sha256", "")))):
            return False
        if receipt.get("content_hash") != content_hash(record) or receipt.get("policy_version") != record.get("policy_version"):
            return False
        try:
            parsed = datetime.fromisoformat(receipt.get("timestamp", "").replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return False
        except (ValueError, TypeError):
            return False
    return True


def normalized_utterance(text: str) -> str:
    # Conservative cross-split candidate detection, not a claim of semantic understanding.
    text = re.sub(r"\b\d+(?:[.,]\d+)*\b", "<number>", text.casefold())
    return " ".join(re.findall(r"[\w<>]+", text, re.UNICODE))


def load_manifest_records(path: str | Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = read_json(path)
    if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), list):
        raise PipelineError("invalid_manifest")
    rows: list[dict[str, Any]] = []
    for entry in manifest["files"]:
        source = resolve_path(entry["path"])
        if file_hash(source) != entry.get("sha256"):
            raise PipelineError("manifest_file_hash_mismatch")
        rows.extend(read_jsonl(source))
    return manifest, rows


def config_errors(config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for name in ("base_model", "base_revision", "tokenizer_revision", "policy_version", "run_id"):
        value = config.get(name)
        if not isinstance(value, str) or not value or value.startswith(("PIN_", "SELECT_", "RESOLVE_")):
            errors.append(f"unresolved_{name}")
    for name in ("base_revision", "tokenizer_revision"):
        if not re.fullmatch(r"[0-9a-f]{40}", str(config.get(name, ""))):
            errors.append(f"immutable_commit_required:{name}")
    targets = config.get("lora", {}).get("target_modules")
    if not isinstance(targets, list) or not targets or not all(isinstance(value, str) and value for value in targets):
        errors.append("lora_target_modules_required")
    compute = config.get("compute", {})
    for name in ("max_gpu_hours", "max_spend", "hourly_rate"):
        value = compute.get(name)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0 or (name == "max_gpu_hours" and value == 0):
            errors.append(f"compute_limit_required:{name}")
    if compute.get("profile") not in {"local", "authorized_remote"}:
        errors.append("compute_profile_required")
    if compute.get("profile") == "authorized_remote" and not compute.get("authorization_ref"):
        errors.append("remote_compute_authorization_required")
    if config.get("optimization", {}).get("assistant_only_loss") is not True:
        errors.append("assistant_only_loss_required")
    if not isinstance(config.get("sequence_length"), int) or config["sequence_length"] < 128:
        errors.append("invalid_sequence_length")
    return errors
