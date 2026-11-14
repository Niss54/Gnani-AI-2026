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

    from training.artifacts import verify_artifacts
    from training.common import PipelineError, digest, read_json
    import subprocess
    manifest = {"type": "model_package_manifest", "timestamp": utc_now(), "status": "blocked",
                "reloaded_verified": False, "promoted": False, "promotion_eligible": False}
    try:
        config, inventory = verify_artifacts(resolved_run)
        artifact_digest = digest(inventory)
        if verify_reload:
            completed = subprocess.run([sys.executable, "-m", "training.reload_model", "--run", str(resolved_run)],
                cwd=ROOT_DIR, capture_output=True, text=True, timeout=300)
            if completed.returncode != 0:
                raise PipelineError("fresh_process_reload_failed")
        reload_path = resolved_run / "reload_receipt.json"
        if not reload_path.exists():
            raise PipelineError("fresh_process_reload_required")
        reload = read_json(reload_path)
        if reload.get("status") != "passed" or reload.get("artifact_digest") != artifact_digest:
            raise PipelineError("reload_receipt_mismatch")
        manifest.update(reloaded_verified=True, artifact_digest=artifact_digest, artifacts=inventory, status="passed")
        if freeze_candidate:
            if read_json(resolved_run / "run_receipt.json").get("mode") != "full":
                raise PipelineError("smoke_run_cannot_be_frozen_for_promotion")
            frozen = {"type": "candidate_freeze_receipt", "artifact_digest": artifact_digest,
                      "manifest_hash": file_hash(config["dataset_manifest"]), "reloaded_verified": True,
                      "timestamp": utc_now(), "promotion_eligible": False}
            freeze_path = resolved_run / "freeze_receipt.json"
            if freeze_path.exists():
                prior = read_json(freeze_path)
                if prior.get("artifact_digest") != frozen["artifact_digest"] or prior.get("manifest_hash") != frozen["manifest_hash"]:
                    raise PipelineError("immutable_freeze_already_exists")
            else:
                with freeze_path.open("x", encoding="utf-8") as stream:
                    json.dump(frozen, stream, indent=2)
            manifest["candidate_frozen"] = True
        if require_promotion_gates:
            raise PipelineError("promotion_requires_separate_model_voice_and_pilot_qualification")
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        manifest.update(status="blocked", blocker=str(exc) if isinstance(exc, PipelineError) else type(exc).__name__)
    atomic_json(resolved_run / "package_manifest.json", manifest)
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
    return 0 if result.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
