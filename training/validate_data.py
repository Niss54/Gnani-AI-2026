"""CLI tool to validate dataset manifests and dialogue records.

Enforces schema counts, source rights, PII rules, review receipts,
exact/semantic duplicate isolation, and scenario-group split invariants.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import resolve_path, atomic_json
from training.data_pipeline import validate_dataset


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate dataset manifest and dialogue integrity.")
    parser.add_argument("--manifest", default="training/manifests/revclaim-v1.json", help="Path to dataset manifest")
    parser.add_argument("--require-human-approved", action="store_true", help="Require verified human approval receipts")
    parser.add_argument("--require-complete", action="store_true", help="Require complete 1600 group production counts")
    parser.add_argument("--output", default="artifacts/verification/dataset.json", help="Path to write validation report")

    args = parser.parse_args()
    report = validate_dataset(
        args.manifest,
        require_human=args.require_human_approved,
        require_complete=args.require_complete,
    )

    out_path = resolve_path(args.output)
    atomic_json(out_path, report)

    print(json.dumps(report, indent=2))
    return 0 if report.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
