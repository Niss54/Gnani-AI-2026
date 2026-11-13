"""Candidate model and dialogue evaluation script.

Runs candidates against the conversation controller and held-out scenarios.
Enforces freeze receipts for locked-test splits.
Never invents passing metrics when dependencies or models are absent.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import atomic_json, file_hash, resolve_path, utc_now


def evaluate_run(
    run_dir: str | Path,
    split: str = "development",
    compare_models: list[str] | None = None,
    require_freeze: bool = False,
    output_path: str | Path = "artifacts/evaluation/dialogue.json",
) -> dict[str, Any]:
    resolved_run = resolve_path(run_dir)
    models = compare_models or ["corrected-hosted", "base"]

    freeze_receipt_path = resolved_run / "freeze_receipt.json"
    if (require_freeze or split == "locked-test") and not freeze_receipt_path.exists():
        report = {
            "evaluation": "dialogue_benchmark",
            "status": "failed",
            "error": "freeze_receipt_required_for_locked_test",
            "timestamp": utc_now(),
        }
        atomic_json(output_path, report)
        return report

    report = {
        "tool": "dialogue_evaluator", "status": "blocked", "split": split,
        "run_dir": str(resolved_run), "timestamp": utc_now(),
        "models_requested": models, "models_evaluated": [], "metrics": {},
        "blocker": "candidate_inference_and_heldout_scoring_not_implemented",
        "summary": "No inference ran. No model quality or accuracy claim is available.",
    }

    out_file = resolve_path(output_path)
    atomic_json(out_file, report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate dialogue candidates and baselines.")
    parser.add_argument("--run", default="artifacts/training/revclaim-sft-candidate-001", help="Path to training run")
    parser.add_argument("--split", choices=["development", "locked-test"], default="development", help="Split to evaluate")
    parser.add_argument("--compare", default="corrected-hosted,base", help="Comma-separated model identifiers to compare")
    parser.add_argument("--require-freeze", action="store_true", help="Enforce freeze receipt before evaluating")
    parser.add_argument("--output", default="artifacts/evaluation/dialogue.json", help="Path to write evaluation report")

    args = parser.parse_args()
    models = [m.strip() for m in args.compare.split(",") if m.strip()]
    report = evaluate_run(args.run, split=args.split, compare_models=models, require_freeze=args.require_freeze, output_path=args.output)

    print(json.dumps(report, indent=2))
    return 0 if report.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
