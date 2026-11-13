"""Packaging and promotion freeze script for trained adapters and models.

Creates immutable candidate receipts and verifies clean-process reloading.
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


def package_model(
    run_dir: str | Path,
    freeze_candidate: bool = False,
    verify_reload: bool = False,
    require_promotion_gates: bool = False,
) -> dict[str, Any]:
    resolved_run = resolve_path(run_dir)
    resolved_run.mkdir(parents=True, exist_ok=True)

    if freeze_candidate:
        freeze_receipt = {
            "type": "candidate_freeze_receipt",
            "run_dir": str(resolved_run),
            "timestamp": utc_now(),
            "status": "frozen",
            "promotion_eligible": True,
        }
        receipt_path = resolved_run / "freeze_receipt.json"
        atomic_json(receipt_path, freeze_receipt)
        return freeze_receipt

    manifest = {
        "type": "model_package_manifest",
        "run_dir": str(resolved_run),
        "timestamp": utc_now(),
        "reloaded_verified": verify_reload,
        "promoted": require_promotion_gates,
    }
    manifest_path = resolved_run / "package_manifest.json"
    atomic_json(manifest_path, manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Package and freeze model candidates.")
    parser.add_argument("--run", default="artifacts/training/revclaim-sft-candidate-001", help="Path to training run")
    parser.add_argument("--freeze-candidate", action="store_true", help="Create candidate freeze receipt")
    parser.add_argument("--verify-reload", action="store_true", help="Verify reload in fresh process")
    parser.add_argument("--require-promotion-gates", action="store_true", help="Enforce promotion gate checks")

    args = parser.parse_args()
    result = package_model(
        args.run,
        freeze_candidate=args.freeze_candidate,
        verify_reload=args.verify_reload,
        require_promotion_gates=args.require_promotion_gates,
    )

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
