"""Scenario materialization, approval gates and leakage-resistant SFT exports."""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from training.common import (
    APPROVED_LICENSES, LANGUAGES, ROOT, SPLITS, PipelineError, atomic_json,
    canonical_json, content_hash, digest, file_hash, load_manifest_records,
    normalized_utterance, read_json, read_jsonl, report, resolve_path,
    review_valid, utc_now, validate_response, write_jsonl,
)


def path_label(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def load_catalog(path: str | Path) -> dict[str, Any]:
    # JSON is a YAML subset, and the supplied catalog deliberately uses that subset.
    text = resolve_path(path).read_text(encoding="utf-8-sig")
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise PipelineError("catalog_must_use_documented_json_subset_of_yaml") from exc
    if not isinstance(value, dict) or not isinstance(value.get("scenarios"), list):
        raise PipelineError("invalid_scenario_catalog")
    return value


def build_corpus(catalog_path: str | Path, output: str | Path, manifest_path: str | Path) -> dict[str, Any]:
    catalog = load_catalog(catalog_path)
    destination = resolve_path(output)
    rows_path = destination / "dialogues.jsonl"
    existing = {row["example_id"]: row for row in read_jsonl(rows_path)} if rows_path.exists() else {}
    rows = dict(existing)
    conflicts: list[str] = []
    groups: set[str] = set()
    for scenario in catalog["scenarios"]:
        group = scenario["scenario_group_id"]
        if group in groups:
            raise PipelineError("duplicate_catalog_scenario_id")
        groups.add(group)
        for language in LANGUAGES:
            examples = scenario.get("dialogues", {}).get(language, [])
            for variant, dialogue in enumerate(examples):
                example_id = f"{group}-{language}-{variant}"
                record = {
                    "example_id": example_id,
                    "scenario_group_id": group,
                    "family_id": scenario["family_id"],
                    "language": language,
                    "variant": variant,
                    "split": scenario["split"],
                    "policy_version": catalog["policy_version"],
                    "objective": scenario["objective"],
                    "source": {
                        "kind": "first_party_authored",
                        "license": "project_authorized",
                        "source_url": None,
                        "source_revision": catalog["version"],
                        "synthetic": True,
                        "generator_version": "revclaim-authored-seeds-v1",
                        "rights_review": "project_authored_no_external_corpus",
                    },
                    "turns": dialogue["turns"],
                    "review": {"status": "draft", "receipts": []},
                }
                record["content_hash"] = content_hash(record)
                if example_id in existing:
                    if content_hash(existing[example_id]) != record["content_hash"]:
                        conflicts.append(example_id)
                    # Regeneration must never replace reviewed or independently edited content.
                    continue
                rows[example_id] = record
    ordered = [rows[key] for key in sorted(rows)]
    write_jsonl(rows_path, ordered)
    manifest = {
        "dataset_version": catalog["version"],
        "policy_version": catalog["policy_version"],
        "purpose": "draft_review_queue",
        "created_at": utc_now(),
        "catalog_hash": file_hash(catalog_path),
        "files": [{"path": path_label(rows_path), "sha256": file_hash(rows_path)}],
        "expected": {"families": 40, "scenario_groups": 1600, "dialogues": 9600,
                     "groups_per_family": {"train": 28, "development": 6, "locked-test": 6},
                     "dialogues_per_split": {"train": 6720, "development": 1440, "locked-test": 1440}},
        "actual": {"scenario_groups": len({row["scenario_group_id"] for row in ordered}), "dialogues": len(ordered)},
        "production_ready": False,
        "conflicts": conflicts,
    }
    atomic_json(manifest_path, manifest)
    atomic_json(destination / "review_queue.json", {"items": [{"example_id": row["example_id"], "content_hash": content_hash(row), "status": row["review"]["status"]} for row in ordered]})
    return report("corpus_build", "failed" if conflicts else "passed", mode="offline_drafts", production_ready=False,
                  actual=manifest["actual"], target=manifest["expected"], conflicts=conflicts,
                  manifest=path_label(resolve_path(manifest_path)), human_approved=sum(review_valid(row) for row in ordered))


def validate_record(row: dict[str, Any], *, require_human: bool) -> list[str]:
    errors: list[str] = []
    for field in ("example_id", "scenario_group_id", "family_id", "objective", "policy_version"):
        if not isinstance(row.get(field), str) or not row[field]:
            errors.append(f"invalid_{field}")
    if row.get("split") not in SPLITS:
        errors.append("invalid_split")
    if row.get("language") not in LANGUAGES:
        errors.append("invalid_language")
    if row.get("content_hash") != content_hash(row):
        errors.append("content_hash_mismatch")
    source = row.get("source", {})
    if source.get("license") not in APPROVED_LICENSES or not source.get("rights_review"):
        errors.append("source_rights_not_cleared")
    if source.get("kind") != "first_party_authored" and (not source.get("source_url") or not source.get("source_revision")):
        errors.append("external_source_provenance_missing")
    if not isinstance(source.get("synthetic"), bool):
        errors.append("synthetic_provenance_missing")
    if row.get("review", {}).get("status") not in {"draft", "machine_checked", "human_approved", "rejected"}:
        errors.append("invalid_review_status")
    if row.get("review", {}).get("status") == "rejected":
        errors.append("rejected_record")
    if (require_human or row.get("review", {}).get("status") == "human_approved") and not review_valid(row):
        errors.append("valid_human_approval_required")
    turns = row.get("turns")
    if not isinstance(turns, list) or not turns:
        return errors + ["nonempty_turns_required"]
    turn_ids: set[str] = set()
    for index, turn in enumerate(turns):
        prefix = f"turn_{index}:"
        if not isinstance(turn, dict):
            errors.append(prefix + "invalid_turn")
            continue
        turn_id = str(turn.get("turn_id", ""))
        if not turn_id or turn_id in turn_ids:
            errors.append(prefix + "invalid_or_duplicate_turn_id")
        turn_ids.add(turn_id)
        if turn.get("context_end_index") != index:
            errors.append(prefix + "context_boundary_required")
        if not isinstance(turn.get("facts"), dict) or not isinstance(turn.get("allowed_actions"), list):
            errors.append(prefix + "typed_facts_and_action_allowlist_required")
            continue
        if not isinstance(turn.get("state"), str):
            errors.append(prefix + "state_required")
        messages = turn.get("messages", [])
        if not isinstance(messages, list) or not messages:
            errors.append(prefix + "messages_required")
            continue
        for message in messages:
            if not isinstance(message, dict) or message.get("role") not in {"user", "assistant", "tool"} or not isinstance(message.get("content"), str):
                errors.append(prefix + "invalid_message")
                continue
            observed = message.get("available_at_turn")
            if not isinstance(observed, int) or observed > index or observed < 0:
                errors.append(prefix + "future_or_unversioned_message")
        versions = turn.get("fact_available_at", {})
        if set(versions) != set(turn["facts"]) or any(not isinstance(value, int) or value > index or value < 0 for value in versions.values()):
            errors.append(prefix + "future_or_unversioned_fact")
        errors.extend(prefix + item for item in validate_response(turn.get("target"), language=row.get("language"), allowed=turn["allowed_actions"], facts=turn["facts"]))
        if turn.get("target", {}).get("turn_id") != turn_id:
            errors.append(prefix + "target_turn_id_mismatch")
        if not isinstance(turn.get("critical"), bool):
            errors.append(prefix + "critical_label_required")
        if not isinstance(turn.get("forbidden_claims"), list):
            errors.append(prefix + "forbidden_claims_required")
    # Data reuse needs a real redaction review, not a heuristic claim of anonymization.
    if source.get("kind") == "call_recording" and not source.get("redaction_receipt"):
        errors.append("call_redaction_receipt_required")
    return errors


def validate_dataset(manifest_path: str | Path, *, require_human: bool = False, require_complete: bool = False) -> dict[str, Any]:
    manifest, rows = load_manifest_records(manifest_path)
    issues: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    groups: dict[str, set[str]] = defaultdict(set)
    group_family: dict[str, set[str]] = defaultdict(set)
    utterances: dict[str, list[tuple[str, str]]] = defaultdict(list)
    per_family: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    group_variants: dict[str, set[tuple[str, int]]] = defaultdict(set)
    counts: Counter[str] = Counter()
    for row in rows:
        identity = str(row.get("example_id", "invalid_id"))
        errors = validate_record(row, require_human=require_human)
        if identity in seen_ids:
            errors.append("duplicate_example_id")
        seen_ids.add(identity)
        if errors:
            issues.append({"example_id": identity, "errors": errors})
        group, split, family = str(row.get("scenario_group_id")), str(row.get("split")), str(row.get("family_id"))
        groups[group].add(split)
        group_family[group].add(family)
        per_family[family][split].add(group)
        variant_key = (str(row.get("language")), row.get("variant", -1))
        if variant_key in group_variants[group]:
            issues.append({"example_id": identity, "errors": ["duplicate_language_variant"]})
        group_variants[group].add(variant_key)
        counts[split] += 1
        for turn in row.get("turns", []):
            for message in turn.get("messages", []):
                if message.get("role") == "user":
                    normalized = normalized_utterance(message.get("content", ""))
                    utterances[normalized].append((group, split))
    for group, splits in groups.items():
        if len(splits) > 1 or len(group_family[group]) > 1:
            issues.append({"scenario_group_id": group, "errors": ["scenario_group_leakage_or_family_mismatch"]})
    lexical_collisions = []
    for text, origins in utterances.items():
        # Short phrases such as "yes" are not useful duplicate fingerprints.
        if len(text.split()) >= 5 and len({split for _, split in origins}) > 1:
            lexical_collisions.append(sorted({group for group, _ in origins}))
    if lexical_collisions:
        issues.append({"errors": ["cross_split_normalized_utterance_collision"], "groups": lexical_collisions})
    # Use fingerprints for lexical near-duplicates. Human semantic review remains an explicit gate.
    near_collisions: set[tuple[str, str]] = set()
    inverted: dict[str, list[int]] = defaultdict(list)
    entries: list[tuple[set[str], list[tuple[str, str]]]] = []
    for text, origins in sorted(utterances.items()):
        tokens = set(text.split())
        if len(tokens) < 8:
            continue
        candidates: set[int] = set()
        for token in tokens:
            candidates.update(inverted[token])
        for candidate in candidates:
            other_tokens, other_origins = entries[candidate]
            if len(tokens & other_tokens) / len(tokens | other_tokens) >= 0.9:
                for first_group, first_split in origins:
                    for second_group, second_split in other_origins:
                        if first_split != second_split:
                            near_collisions.add(tuple(sorted((first_group, second_group))))
        for token in tokens:
            inverted[token].append(len(entries))
        entries.append((tokens, origins))
    if near_collisions:
        issues.append({"errors": ["cross_split_lexical_near_duplicate"], "groups": sorted(near_collisions)})
    if require_complete:
        if len(groups) != 1600 or len(rows) != 9600 or len(per_family) != 40:
            issues.append({"errors": ["production_corpus_counts_incomplete"]})
        for family, splits in per_family.items():
            if {split: len(splits[split]) for split in SPLITS} != {"train": 28, "development": 6, "locked-test": 6}:
                issues.append({"family_id": family, "errors": ["family_split_counts_incomplete"]})
        expected_variants = {(language, variant) for language in LANGUAGES for variant in range(3)}
        if any(variants != expected_variants for variants in group_variants.values()):
            issues.append({"errors": ["three_variants_per_language_required"]})
        semantic_receipt = manifest.get("semantic_review", {})
        if semantic_receipt.get("actor_type") != "human" or not semantic_receipt.get("reviewer_id") or semantic_receipt.get("files_hash") != digest(manifest["files"]):
            issues.append({"errors": ["human_semantic_distinctness_review_required"]})
    return report("dataset_validation", "failed" if issues else "passed", mode="offline",
                  manifest_hash=file_hash(manifest_path), dataset_version=manifest.get("dataset_version"),
                  policy_version=manifest.get("policy_version"), require_human_approved=require_human,
                  require_complete=require_complete, production_ready=not issues and require_human and require_complete,
                  counts={"dialogues": len(rows), "scenario_groups": len(groups), "per_split": dict(counts)},
                  human_approved=sum(review_valid(row) for row in rows), issues=issues,
                  semantic_check="lexical_candidates_only_plus_required_human_attestation_for_complete_corpus")


def training_example(row: dict[str, Any], index: int) -> dict[str, Any]:
    turn = row["turns"][index]
    context = {"state": turn["state"], "facts": turn["facts"], "allowed_actions": turn["allowed_actions"],
               "language": row["language"], "policy_version": row["policy_version"], "turn_id": turn["turn_id"]}
    system = "You are an AI billing assistant. Use only supplied facts and allowed actions. Return the response-plan JSON schema. Never claim an action succeeded without its tool result.\n" + canonical_json(context)
    messages = [{"role": "system", "content": system}]
    messages.extend({"role": message["role"], "content": message["content"]} for message in turn["messages"])
    return {"example_id": f"{row['example_id']}:{turn['turn_id']}", "scenario_group_id": row["scenario_group_id"],
            "family_id": row["family_id"], "language": row["language"], "messages": messages,
            "target": canonical_json(turn["target"]), "critical": turn["critical"],
            "source_content_hash": content_hash(row)}


def tokenize_example(example: dict[str, Any], tokenizer: Any, max_length: int) -> dict[str, list[int]]:
    prefix = tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=True)
    complete = tokenizer.apply_chat_template([*example["messages"], {"role": "assistant", "content": example["target"]}], tokenize=False, add_generation_prompt=False)
    if not complete.startswith(prefix):
        raise PipelineError("chat_template_not_prefix_stable_for_assistant_mask")
    # Tokenize the complete sequence once; offset mapping is not universally available.
    prefix_ids = tokenizer(prefix, add_special_tokens=False)["input_ids"]
    full_ids = tokenizer(complete, add_special_tokens=False)["input_ids"]
    if full_ids[:len(prefix_ids)] != prefix_ids:
        raise PipelineError("token_boundary_crosses_assistant_prefix")
    if len(full_ids) > max_length:
        raise PipelineError("sequence_would_truncate_required_context")
    if len(prefix_ids) >= len(full_ids):
        raise PipelineError("no_supervised_assistant_tokens")
    return {"input_ids": full_ids, "attention_mask": [1] * len(full_ids), "labels": [-100] * len(prefix_ids) + full_ids[len(prefix_ids):]}


def export_sft(manifest_path: str | Path, config: dict[str, Any], output: str | Path, *, schema_only: bool = False, tokenizer: Any = None) -> dict[str, Any]:
    checked = validate_dataset(manifest_path, require_human=True)
    if checked["status"] != "passed":
        raise PipelineError("approved_dataset_validation_failed")
    manifest, rows = load_manifest_records(manifest_path)
    if tokenizer is None and not schema_only:
        try:
            from transformers import AutoTokenizer
        except ImportError as exc:
            raise PipelineError("missing_dependency:transformers") from exc
        tokenizer = AutoTokenizer.from_pretrained(config["base_model"], revision=config["tokenizer_revision"], local_files_only=True, trust_remote_code=False)
    destination = resolve_path(output)
    exported: dict[str, Any] = {}
    for split in ("train", "development"):
        examples = [training_example(row, index) for row in rows if row["split"] == split for index in range(len(row["turns"]))]
        tokenized = [tokenize_example(example, tokenizer, config["sequence_length"]) for example in examples] if tokenizer is not None else []
        path = destination / f"{split}.jsonl"
        write_jsonl(path, examples)
        exported[split] = {"path": path_label(path), "sha256": file_hash(path), "examples": len(examples),
                           "tokens": sum(len(item["input_ids"]) for item in tokenized) if tokenized else None,
                           "supervised_tokens": sum(sum(label != -100 for label in item["labels"]) for item in tokenized) if tokenized else None}
    result = report("sft_export", "passed", mode="schema_only" if schema_only else "tokenized", training_ready=not schema_only,
                    manifest_hash=file_hash(manifest_path), dataset_version=manifest["dataset_version"],
                    config_hash=digest(config), exports=exported, locked_test_exported=False)
    atomic_json(destination / "export_manifest.json", result)
    return result
