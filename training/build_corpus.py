"""CLI tool to materialize scenario catalog and draft dialogue corpus.

Enforces:
- Resume by scenario ID without overwriting approved work.
- Explicit draft status (no fabricated human approval).
- Generation manifest and review queue output.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import resolve_path
from training.data_pipeline import build_corpus


def main() -> int:
    parser = argparse.ArgumentParser(description="Build draft corpus from scenario catalog.")
    parser.add_argument("--catalog", default="training/specs/scenario_catalog.json", help="Path to scenario catalog")
    parser.add_argument("--output", default="training/data/draft", help="Output directory for draft dialogues")
    parser.add_argument("--manifest", default="training/manifests/revclaim-v1.json", help="Path to write draft manifest")

    args = parser.parse_args()
    report = build_corpus(args.catalog, args.output, args.manifest)

    print(json.dumps(report, indent=2))
    return 0 if report.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
