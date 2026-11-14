"""Export readable review packets and import explicit, hash-bound human decisions.

This command never invents an approval or converts a machine pass into human review.
"""
from __future__ import annotations
import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from training.data_pipeline import path_label
from training.common import REVIEW_ATTESTATION, PipelineError, atomic_json, content_hash, file_hash, load_manifest_records, read_json, review_valid, write_jsonl, utc_now


def export_packet(manifest_path: str, output: str, limit: int = 12, *, split: str = "unlocked") -> dict[str, Any]:
    if not 1 <= limit <= 100:
        raise PipelineError("review_packet_limit_must_be_1_to_100")
    _, rows = load_manifest_records(manifest_path)
    # Locked test goes through independent review, not an ordinary developer packet.
    selected = [r for r in rows if (r["split"] != "locked-test" if split == "unlocked" else r["split"] == split) and r["review"]["status"] == "draft"][:limit]
    if not selected:
        raise PipelineError("no_drafts_in_requested_split")
    packet = {"manifest_sha256": file_hash(manifest_path), "reviewer_id": "", "actor_type": "human",
              "attestation": "", "decisions": []}
    lines = ["# Bilingual human review packet", "", "Drafts are not approved. Check intent, language, financial facts, permission and whether the agent listened.",
             "Read both caller and response. Edit the dataset in a new version when corrections are needed. Choose approve or reject in the companion decisions JSON.", ""]
    for row in selected:
        packet["decisions"].append({"example_id": row["example_id"], "content_hash": content_hash(row), "decision": "", "notes": ""})
        lines += [f"## {row['example_id']} ({row['language']}, {row['split']})", ""]
        for turn in row["turns"]:
            lines += [f"State: {turn['state']}", "", f"Facts: `{json.dumps(turn['facts'], ensure_ascii=False)}`", ""]
            lines += [f"**{m['role']}:** {m['content']}" for m in turn["messages"]]
            lines += [f"**Proposed reply:** {turn['target']['free_reply'] or turn['target']['reply_template_id']}",
                      f"**Intent/action:** {turn['target']['intent']} / {turn['target']['proposed_action']}", ""]
    target = Path(output)
    if target.exists() or target.with_suffix(".json").exists():
        raise PipelineError("review_packet_already_exists")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines), encoding="utf-8")
    atomic_json(target.with_suffix(".json"), packet)
    return {"status": "passed", "examples_exported": len(selected), "human_approved": 0}


def import_decisions(manifest_path: str, decisions_path: str, output_dir: str) -> dict[str, Any]:
    manifest, rows = load_manifest_records(manifest_path)
    decisions = read_json(decisions_path)
    if decisions.get("actor_type") != "human" or not str(decisions.get("reviewer_id", "")).strip() or decisions.get("attestation") != REVIEW_ATTESTATION:
        raise PipelineError("explicit_human_review_attestation_required")
    if decisions.get("manifest_sha256") != file_hash(manifest_path):
        raise PipelineError("review_packet_manifest_changed")
    by_id = {row["example_id"]: copy.deepcopy(row) for row in rows}
    seen = set()
    submitted = decisions.get("decisions")
    if not isinstance(submitted, list) or not submitted:
        raise PipelineError("nonempty_review_decisions_required")
    for decision in submitted:
        key = decision.get("example_id")
        if key not in by_id or key in seen or decision.get("decision") not in {"approve", "reject"}:
            raise PipelineError("invalid_duplicate_or_unfinished_review_decision")
        seen.add(key)
        row = by_id[key]
        if decision.get("content_hash") != content_hash(row):
            raise PipelineError("review_content_changed")
        receipt = {"source": "reviewer_decision_import", "attestation": REVIEW_ATTESTATION,
                   "decision_file_sha256": file_hash(decisions_path), "actor_type": "human", "reviewer_id": decisions["reviewer_id"], "timestamp": utc_now(),
                   "content_hash": content_hash(row), "policy_version": row["policy_version"], "notes": decision.get("notes", "")}
        row["review"] = {"status": "human_approved" if decision["decision"] == "approve" else "rejected", "receipts": [receipt]}
    dest = Path(output_dir).resolve()
    if dest.exists():
        raise PipelineError("review_output_requires_new_directory")
    dest.mkdir(parents=True)
    path = dest / "dialogues.jsonl"
    write_jsonl(path, list(by_id.values()))
    manifest.update(files=[{"path": path_label(path), "sha256": file_hash(path)}], production_ready=False, parent_manifest_sha256=file_hash(manifest_path))
    # Any previous semantic attestation is invalidated by a new file inventory.
    manifest.pop("semantic_review", None)
    manifest.pop("review_summary", None)
    manifest["actual"] = {"dialogues": len(rows), "scenario_groups": len({r["scenario_group_id"] for r in rows}),
                          "human_approved": sum(review_valid(r) for r in by_id.values())}
    atomic_json(dest / "manifest.json", manifest)
    return {"status": "passed", "decisions_imported": len(seen), "manifest": str(dest / "manifest.json")}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["export", "import"])
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--decisions")
    parser.add_argument("--split", choices=["unlocked", "locked-test", "train", "development"], default="unlocked")
    parser.add_argument("--limit", type=int, default=12)
    args = parser.parse_args()
    try:
        if args.operation == "export":
            result = export_packet(args.manifest, args.output, args.limit, split=args.split)
        else:
            if not args.decisions:
                raise PipelineError("decisions_file_required")
            result = import_decisions(args.manifest, args.decisions, args.output)
    except (PipelineError, OSError, ValueError) as exc:
        result = {"status": "failed", "error": str(exc)}
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
