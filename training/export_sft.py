"""CLI tool to deterministically export SFT training examples.

Generates assistant-only loss targets with turn-local context and prompt template checks.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import read_json, resolve_path
from training.data_pipeline import export_sft


def main() -> int:
    parser = argparse.ArgumentParser(description="Export supervised fine-tuning dataset.")
    parser.add_argument("--manifest", default="training/manifests/revclaim-v1.json", help="Path to dataset manifest")
    parser.add_argument("--config", default="training/configs/revclaim-sft.json", help="Path to training config")
    parser.add_argument("--output", default="training/data/sft", help="Output directory for SFT data")
    parser.add_argument("--schema-only", action="store_true", help="Export without requiring tokenizer/GPU libraries")

    args = parser.parse_args()
    config = read_json(args.config)

    report = export_sft(
        args.manifest,
        config,
        args.output,
        schema_only=args.schema_only,
    )

    print(json.dumps(report, indent=2))
    return 0 if report.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
